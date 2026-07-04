import os
import chromadb
from PyPDF2 import PdfReader
import docx
from app.core.config import settings

try:
    # Try HTTP Client first (Docker environment)
    chroma_client = chromadb.HttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT
    )
    collection = chroma_client.get_or_create_collection(name="agent_documents")
    print(f"[CHROMA] Connected to remote ChromaDB successfully at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
except Exception as e:
    print(f"[CHROMA WARNING] Failed to connect to remote ChromaDB: {e}. Falling back to PersistentClient (local sqlite).")
    try:
        # Fallback to local Persistent Client (suitable for serverless environments like Render)
        chroma_client = chromadb.PersistentClient(path="chroma_db")
        collection = chroma_client.get_or_create_collection(name="agent_documents")
        print("[CHROMA] Local Persistent ChromaDB client initialized successfully.")
    except Exception as fallback_err:
        print(f"[CHROMA ERROR] Failed to initialize local Persistent client: {fallback_err}")
        collection = None


# ====== File Parsers ======
def parse_pdf(file_path: str) -> tuple[str, int]:
    """Extract text and page count from PDF file"""
    reader = PdfReader(file_path)
    page_count = len(reader.pages)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text, page_count

def parse_docx(file_path: str) -> str:
    """Extract text from Docx file with a robust fallback for corrupted files"""
    try:
        doc = docx.Document(file_path)
        text = []
        for paragraph in doc.paragraphs:
            text.append(paragraph.text)
        return "\n".join(text)
    except Exception as e:
        print(f"Standard python-docx parser failed: {e}. Attempting robust fallback parsing...")
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            
            with zipfile.ZipFile(file_path) as z:
                if 'word/document.xml' not in z.namelist():
                    raise e
                
                xml_content = z.read('word/document.xml')
                root = ET.fromstring(xml_content)
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                
                paragraphs_text = []
                for p_elem in root.iter(f"{{{namespaces['w']}}}p"):
                    p_text = []
                    # Traverse all descendants in document order
                    for child in p_elem.iter():
                        tag_local = child.tag.split('}')[-1]
                        if tag_local == 't' and child.text:
                            p_text.append(child.text)
                        elif tag_local == 'tab':
                            p_text.append('\t')
                        elif tag_local in ['br', 'cr']:
                            p_text.append('\n')
                        elif tag_local == 'noBreakHyphen':
                            p_text.append('-')
                    
                    paragraphs_text.append("".join(p_text))
                
                extracted_text = "\n".join(paragraphs_text)
                if not extracted_text.strip():
                    raise e
                return extracted_text
        except Exception as fallback_err:
            print(f"Fallback parsing also failed: {fallback_err}")
            raise e

# ====== 2. Text Splitter ======
def split_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """
    Recursively splits text on paragraphs, newlines, spaces, and finally characters
    to keep chunks close to chunk_size without splitting words or sentences.
    """
    if not text:
        return []

    # Separators in order of priority (paragraphs, sentences, words, characters)
    separators = ["\n\n", "\n", " ", ""]
    
    def _split(text_to_split: str, current_seps: list[str]) -> list[str]:
        if len(text_to_split) <= chunk_size:
            return [text_to_split]
            
        if not current_seps:
            # Force character split if no separators left
            step = chunk_size - chunk_overlap
            if step <= 0:
                step = chunk_size
            return [text_to_split[i:i + chunk_size] for i in range(0, len(text_to_split), step)]
            
        separator = current_seps[0]
        
        # Split on the current separator
        if separator == "":
            parts = list(text_to_split)
        else:
            parts = text_to_split.split(separator)
            
        chunks = []
        current_chunk = []
        current_len = 0
        
        for part in parts:
            part_len = len(part)
            # If a single part exceeds the chunk size, split it recursively with next separators
            if part_len > chunk_size:
                if current_chunk:
                    chunks.append(separator.join(current_chunk))
                    current_chunk = []
                    current_len = 0
                
                chunks.extend(_split(part, current_seps[1:]))
                continue
                
            # Check if adding this part would exceed the chunk size
            sep_len = len(separator) if current_chunk else 0
            if current_len + sep_len + part_len <= chunk_size:
                current_chunk.append(part)
                current_len += sep_len + part_len
            else:
                # Flush the current chunk
                if current_chunk:
                    chunks.append(separator.join(current_chunk))
                current_chunk = [part]
                current_len = part_len
                
        if current_chunk:
            chunks.append(separator.join(current_chunk))
            
        # Apply overlapping logic between chunks
        final_chunks = []
        for i, chunk in enumerate(chunks):
            if i == 0:
                final_chunks.append(chunk)
            else:
                prev_chunk = chunks[i-1]
                overlap_part = prev_chunk[-chunk_overlap:] if len(prev_chunk) >= chunk_overlap else prev_chunk
                final_chunks.append(overlap_part + chunk)
                
        return final_chunks

    return _split(text, separators)

# ====== 3. Document Ingestion ======
def ingest_document(file_name: str, file_path: str, run_id: int = None, user_id: int = None, file_size: int = None) -> str:
    """Parse document, split it, and store inside ChromaDB with session context and properties"""
    if collection is None:
        return "ChromaDB is not connected."
    
    try:
        page_count = 1
        # File type check
        if file_path.lower().endswith(".pdf"):
            text, page_count = parse_pdf(file_path)
        elif file_path.lower().endswith(".docx"):
            text = parse_docx(file_path)
        elif file_path.lower().endswith(".txt"):
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            return "Unsupported file format. Only PDF, DOCX, and TXT are supported."
        
        if not text.strip():
            return f"Failed to parse document: '{file_name}' (No text found)."
        
        # Text chunking
        chunks = split_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        
        # Add to Chroma (prepend run_id if available to avoid collision across runs)
        ids = [f"run_{run_id}_{file_name}_{idx}" if run_id is not None else f"{file_name}_{idx}" for idx in range(len(chunks))]
        
        # Build metadata dictionary with session information and file stats
        meta = {"source": file_name}
        if run_id is not None:
            meta["run_id"] = run_id
        if user_id is not None:
            meta["user_id"] = user_id
        if file_size is not None:
            meta["file_size_bytes"] = file_size
        if page_count is not None:
            meta["page_count"] = page_count
            
        metadatas = [meta for _ in range(len(chunks))]
        
        collection.upsert(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        return f"Successfully ingested '{file_name}' into ChromaDB ({len(chunks)} chunks)."
    except Exception as e:
        return f"Error during ingestion: {str(e)}"

# ====== 4. Document Search (Agent Tool) ======
def query_documents(query: str, run_id: int = None, n_results: int = 3) -> str:
    if collection is None:
        return "RAG search is currently unavailable(chromadb not connected)"
    
    try:
        # Filter query results by run_id if provided
        where_filter = {"run_id": run_id} if run_id is not None else None
        
        results = collection.query(
            query_texts = [query],
            n_results = n_results,
            where = where_filter
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        if not documents:
            return f"No relevant documents found for query: '{query}'"

        formatted_matches = []
        for idx, (doc, meta) in enumerate(zip(documents, metadatas), 1):
            source = meta.get("source", "Unknown Source")
            size = meta.get("file_size_bytes", "Unknown Size")
            pages = meta.get("page_count", "Unknown Pages")
            
            # Format file size in human-readable form
            if isinstance(size, (int, float)):
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024 * 1024:
                    size_str = f"{size / 1024:.2f} KB"
                else:
                    size_str = f"{size / (1024 * 1024):.2f} MB"
            else:
                size_str = str(size)
                
            formatted_matches.append(
                f"Match {idx} (Source: {source}, Size: {size_str}, Pages: {pages}):\n{doc}\n---"  
            )
        return "\n".join(formatted_matches)
    except Exception as e:
        return f"Error during RAG search: {str(e)}"

        
        
        

        