from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from app.core.config import settings
from app.tools.web_search import search_web
from app.tools.rag import query_documents
from app.tools.code_executor import execute_python_code

# ====== 1. Expose our custom tools to LangChain/LangGraph ======

@tool
def web_search_tool(query: str) -> str:
    """
    Search the web for current events, news, realtime updates, or general facts.
    Use this when the user asks about recent info that you don't know.
    """
    return search_web(query)

from langchain_core.runnables import RunnableConfig
import re

@tool
def rag_search_tool(query: str, config: RunnableConfig) -> str:
    """
    Retrieve relevant context from uploaded documents (RAG).
    Use this when the user asks about topics related to previously uploaded documents.
    """
    thread_id = config.get("configurable", {}).get("thread_id", "")
    # Extract run_id from thread_id (e.g. "run_12" or "run_12_edit_171829283")
    match = re.match(r"run_(\d+)", thread_id)
    run_id = int(match.group(1)) if match else None
    return query_documents(query, run_id=run_id)

@tool
def python_sandbox_tool(code: str) -> str:
    """
    Execute Python code in a secure sandbox.
    """
    return execute_python_code(code)

# Combine all tools in a list 
tools = [web_search_tool, rag_search_tool, python_sandbox_tool]


# ====== 2. Initialize Gemini model using LangChain ======

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",             # Fast, reliable model for tool-calling
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.2
)

# ====== 3. System Prompt for our Agent ======
system_instruction = """
You are an advanced, autonomous AI Agent Platform assistant.
You have access to these three main tools to solve user queries:
1. web_search_tool: Search the internet for latest updates.
2. rag_search_tool: Query user's uploaded files (PDF, DOCX, TXT).
3. python_sandbox_tool: Run Python code for complex math, data, or algorithms.
Rules:
- When writing python code, make sure you write the print statements so that you get the output.
- Be helpful, complete, and write detailed final responses. However, do NOT mention the names of the tools you used or write sentences explaining that you used a tool (like 'I used the Python tool...' or 'I used the search tool...'). Just integrate the findings naturally in your response.
- Always respond in the same language the user used. If user writes in English, reply in English only. If user writes in Hindi or Hinglish, reply in Hindi/Hinglish. Never switch languages on your own.
"""

# ====== 4. Compile the Agent with Memory Checkpointer ======
memory = MemorySaver()  # In-memory checkpointer for managing chat history
agent_executor = create_react_agent(
    llm,
    tools=tools,
    checkpointer=memory,
    prompt=system_instruction
)

# ====== Quick Test script (Optional) ======
if __name__ == "__main__":
    # Test thread ID for memory session
    config = {"configurable": {"thread_id": "test-session"}}
    
    print("Testing Agent Brain with math calculation...")
    user_query = "Write a python code to find the 10th Fibonacci number and run it."
    
    # Run the agent
    response = agent_executor.invoke(
        {"messages": [("user", user_query)]},
        config=config
    )
    
    # Print the last message from the agent
    last_msg = response["messages"][-1]
    print("\nAgent Output:")
    print(last_msg.content)