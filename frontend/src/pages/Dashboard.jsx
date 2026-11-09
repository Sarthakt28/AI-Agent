import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Plus, MessageSquare, Trash2, Bot, Upload, X, AlertCircle,
  ChevronRight, Loader2, Send, User as UserIcon, Cpu, Copy, Check,
  ThumbsUp, ThumbsDown, Pencil, FileText, Menu
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

/* ─────────────────────────────── helpers ─────────────────────────── */
function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/* ─────────────────────────────── Sidebar ─────────────────────────── */
function Sidebar({ token, runs, activeRunId, onSelectRun, onNewRun, onDeleteRun, user, onLogout, isOpen, onClose, loading }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Cpu size={20} />
          <span>OPTIMUS</span>
        </div>
        <button className="icon-btn sidebar-close-btn mobile-only" onClick={onClose} title="Close sidebar">
          <X size={18} />
        </button>
      </div>

      <button className="btn btn-primary new-session-btn" onClick={() => { onNewRun(); onClose(); }}>
        <Plus size={16} />
        New Session
      </button>

      <div className="sidebar-runs-label">Sessions</div>

      <div className="sidebar-runs">
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Loader2 size={20} className="spin-icon" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        {!loading && runs.length === 0 && (
          <p className="sidebar-empty">No sessions yet.<br />Click &ldquo;New Session&rdquo; to start.</p>
        )}
        {runs.map((run) => (
          <div
            key={run.id}
            className={`run-item ${run.id === activeRunId ? 'active' : ''}`}
            onClick={() => { onSelectRun(run.id); onClose(); }}
          >
            <MessageSquare size={14} />
            <span className="run-item-label">{run.goal || `Session #${run.id}`}</span>
            <button
              className="run-delete-btn"
              onClick={(e) => { e.stopPropagation(); onDeleteRun(run.id); }}
              title="Delete session"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
        </div>
        <button className="btn btn-secondary logout-btn" onClick={() => { onLogout(); onClose(); }}>Logout</button>
      </div>
    </aside>
  );
}

/* ──────────────────────────── Code Block Component ────────────────── */
function CodeBlockComponent({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="code-block-pre"><code>{code}</code></pre>
    </div>
  );
}

/* ──────────────────────────── Markdown Formatter ─────────────────── */
function formatMessageContent(content, keyPrefix = 'msg') {
  if (!content) return '';
  const lines = content.split('\n');
  const elements = [];

  // State tracking
  let inList = false;
  let inOrderedList = false;
  let listItems = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLanguage = '';

  // Inline parser: handles **bold**, `inline code`, and [links](url)
  const parseInline = (text) => {
    if (!text) return text;

    // Step 1: Split by inline code backticks first
    const codeParts = text.split('`');
    const result = [];

    codeParts.forEach((part, codeIdx) => {
      if (codeIdx % 2 === 1) {
        // Inside backticks → inline code
        result.push(<code key={`ic-${codeIdx}`} className="inline-code">{part}</code>);
      } else {
        // Outside backticks → parse bold and links
        // Parse links [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;
        const subParts = [];

        while ((match = linkRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            subParts.push(parseBold(part.substring(lastIndex, match.index), `pre-${codeIdx}-${lastIndex}`));
          }
          subParts.push(
            <a key={`link-${codeIdx}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="msg-link">
              {match[1]}
            </a>
          );
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < part.length) {
          subParts.push(parseBold(part.substring(lastIndex), `post-${codeIdx}-${lastIndex}`));
        }

        if (subParts.length === 0) {
          subParts.push(parseBold(part, `full-${codeIdx}`));
        }

        result.push(...subParts);
      }
    });

    return result;
  };

  // Bold parser: handles **bold**
  const parseBold = (text, keyPrefix) => {
    if (!text) return text;
    const parts = text.split('**');
    if (parts.length === 1) return parseItalic(text, keyPrefix);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={`${keyPrefix}-b-${index}`}>{part}</strong>;
      }
      return parseItalic(part, `${keyPrefix}-${index}`);
    });
  };

  // Italic parser: handles *italic* (single asterisk)
  const parseItalic = (text, keyPrefix) => {
    if (!text) return text;
    const parts = text.split(/(?<!\*)\*(?!\*)/);
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <em key={`${keyPrefix}-i-${index}`}>{part}</em>;
      }
      return part;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    const k = `${keyPrefix}-${lineIdx}`;

    // ─── Code Block Toggle (``` handling) ───
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        // Entering code block
        // Flush any pending list
        if (inList) {
          if (inOrderedList) {
            elements.push(<ol key={`${k}-ol`}>{listItems}</ol>);
          } else {
            elements.push(<ul key={`${k}-ul`}>{listItems}</ul>);
          }
          inList = false;
          inOrderedList = false;
          listItems = [];
        }
        inCodeBlock = true;
        codeLanguage = trimmed.substring(3).trim(); // e.g. "python", "javascript"
        codeLines = [];
      } else {
        // Exiting code block → render it
        elements.push(
          <CodeBlockComponent
            key={`${k}-code`}
            language={codeLanguage}
            code={codeLines.join('\n')}
          />
        );
        inCodeBlock = false;
        codeLines = [];
        codeLanguage = '';
      }
      return;
    }

    // If inside code block, just collect lines
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // ─── Unordered List Items (- or *) ───
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        inList = true;
        inOrderedList = false;
        listItems = [];
      }
      const itemText = trimmed.substring(2);
      listItems.push(<li key={k}>{parseInline(itemText)}</li>);
      return;
    }

    // ─── Ordered List Items (1. 2. 3.) ───
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.+)/);
    if (orderedMatch) {
      if (!inList) {
        inList = true;
        inOrderedList = true;
        listItems = [];
      }
      listItems.push(<li key={k}>{parseInline(orderedMatch[2])}</li>);
      return;
    }

    // Flush pending list before any non-list line
    if (inList) {
      if (inOrderedList) {
        elements.push(<ol key={`${k}-ol`}>{listItems}</ol>);
      } else {
        elements.push(<ul key={`${k}-ul`}>{listItems}</ul>);
      }
      inList = false;
      inOrderedList = false;
      listItems = [];
    }

    // ─── Empty Lines ───
    if (trimmed === '') {
      elements.push(<div key={k} style={{ height: '8px' }} />);
      return;
    }

    // ─── Headings ───
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={k} className="msg-heading msg-h3">{parseInline(trimmed.substring(4))}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={k} className="msg-heading msg-h2">{parseInline(trimmed.substring(3))}</h3>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={k} className="msg-heading msg-h1">{parseInline(trimmed.substring(2))}</h2>);
      return;
    }

    // ─── Blockquotes ───
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={k} className="msg-blockquote">
          {parseInline(trimmed.substring(2))}
        </blockquote>
      );
      return;
    }

    // ─── Horizontal Rule ───
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={k} className="msg-hr" />);
      return;
    }

    // ─── Regular Paragraph ───
    elements.push(<p key={k} className="message-paragraph">{parseInline(line)}</p>);
  });

  // Flush remaining list
  if (inList) {
    if (inOrderedList) {
      elements.push(<ol key={`${keyPrefix}-list-final`}>{listItems}</ol>);
    } else {
      elements.push(<ul key={`${keyPrefix}-list-final`}>{listItems}</ul>);
    }
  }

  // Flush unclosed code block (edge case)
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <CodeBlockComponent
        key={`${keyPrefix}-code-final`}
        language={codeLanguage}
        code={codeLines.join('\n')}
      />
    );
  }

  return elements;
}

/* ──────────────────────────── Message Text ───────────────────────── */
function MessageText({ content }) {
  return (
    <div className="message-text">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Reuse your existing styled CodeBlockComponent for fenced code blocks
          code({ node, inline, className, children, ...props }) {
            const language = (className || '').replace('language-', '');
            if (!inline && language) {
              return <CodeBlockComponent language={language} code={String(children).replace(/\n$/, '')} />;
            }
            return <code className="inline-code" {...props}>{children}</code>;
          },
          // Open links safely in a new tab
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="msg-link">{children}</a>;
          },
          p({ children }) { return <p className="message-paragraph">{children}</p>; },
          h1({ children }) { return <h2 className="msg-heading msg-h1">{children}</h2>; },
          h2({ children }) { return <h3 className="msg-heading msg-h2">{children}</h3>; },
          h3({ children }) { return <h4 className="msg-heading msg-h3">{children}</h4>; },
          blockquote({ children }) { return <blockquote className="msg-blockquote">{children}</blockquote>; },
          hr() { return <hr className="msg-hr" />; },
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}

/* ──────────────────────────── Copy Button ────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button 
      className="copy-msg-btn" 
      onClick={handleCopy} 
      title="Copy message"
    >
      {copied ? <Check size={13} className="copied-icon" /> : <Copy size={13} />}
    </button>
  );
}

/* ──────────────────────────── Feedback Buttons ────────────────────── */
function FeedbackButtons() {
  const [like, setLike] = useState(false);
  const [dislike, setDislike] = useState(false);

  const handleLike = () => {
    setLike(!like);
    if (dislike) setDislike(false);
  };

  const handleDislike = () => {
    setDislike(!dislike);
    if (like) setLike(false);
  };

  return (
    <div className="feedback-btns">
      <button 
        className={`feedback-btn ${like ? 'active-like' : ''}`}
        onClick={handleLike}
        title="Like response"
      >
        <ThumbsUp size={13} />
      </button>
      <button 
        className={`feedback-btn ${dislike ? 'active-dislike' : ''}`}
        onClick={handleDislike}
        title="Dislike response"
      >
        <ThumbsDown size={13} />
      </button>
    </div>
  );
}

/* ──────────────────────────── Edit Button ────────────────────────── */
function EditButton({ onEdit }) {
  return (
    <button 
      className="edit-msg-btn" 
      onClick={onEdit} 
      title="Edit message"
    >
      <Pencil size={13} />
    </button>
  );
}
/* ──────────────────────────── ChatWindow ─────────────────────────── */
function ChatWindow({ 
  messages, 
  loading,
  messagesLoading,
  editingMessageId,
  editText,
  setEditText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit 
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const chatMessages = messages.filter((m) => {
    if (m.content && m.content.startsWith('[SYSTEM]')) return false;
    if (m.role === 'tool_call' || m.role === 'tool_result') return false;
    return true;
  });

  // Show skeleton while switching sessions
  if (messagesLoading) {
    return (
      <div className="chat-messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin-icon" />
          <span style={{ fontSize: 14 }}>Loading messages...</span>
        </div>
      </div>
    );
  }

  if (chatMessages.length === 0 && !loading) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon"><Bot size={40} /></div>
        <h3>Ask OPTIMUS anything</h3>
        <p>Type a message below. You can also upload documents for RAG search.</p>
      </div>
    );
  }

  return (
    <div className="chat-messages" ref={containerRef}>
      {chatMessages.map((msg) => {
        return (
          <div key={msg.key || msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            <div className="message-body">
              <div className="message-bubble">
                {msg.tool_name && (
                  <div className="tool-badge">
                    <ChevronRight size={12} />
                    Tool: <strong>{msg.tool_name}</strong>
                  </div>
                )}
                {editingMessageId === msg.id ? (
                  <div className="inline-edit-box">
                    <textarea
                      className="edit-textarea"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="edit-actions">
                      <button className="edit-action-btn cancel-btn" onClick={onCancelEdit}>Cancel</button>
                      <button className="edit-action-btn save-btn" onClick={() => onSaveEdit(msg.id, editText)}>Save & Submit</button>
                    </div>
                  </div>
                ) : msg.content?.startsWith('[ERROR]') ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#f87171', padding: '4px 0' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{msg.content.replace(/^\[ERROR\]\s*/, '')}</span>
                  </div>
                ) : (
                  <MessageText 
                    content={msg.content}
                  />
                )}
              </div>
              <div className="message-actions">
                <CopyButton text={msg.content} />
                {msg.role === 'user' && editingMessageId !== msg.id && (
                  <EditButton onEdit={() => onStartEdit(msg.id, msg.content)} />
                )}
                {msg.role === 'assistant' && <FeedbackButtons />}
              </div>
            </div>
          </div>
        );
      })}

      {loading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
        <div className="message assistant">
          <div className="message-avatar"><Bot size={16} /></div>
          <div className="message-bubble">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ──────────────────────────── MessageInput ───────────────────────── */
function MessageInput({ onSend, onUpload, disabled }) {
  const [text, setText] = useState('');
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-focus textarea when it becomes enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="message-input-wrapper">
      <div className="message-input-box glass-panel">
        <textarea
          ref={textareaRef}
          className="message-textarea"
          placeholder="Ask your agent anything…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          maxLength={8000}
        />
        <div className="message-input-actions">
          <button
            className="icon-btn"
            title="Upload document"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            <Upload size={16} />
          </button>
          <button
            className="btn btn-primary send-btn"
            onClick={submit}
            disabled={disabled || !text.trim()}
            title="Send message"
            aria-label="Send message"
            style={{ color: '#ffffff' }}
          >
            {disabled
              ? <Loader2 size={16} className="spin-icon" style={{ color: '#ffffff', stroke: '#ffffff' }} />
              : <Send size={16} style={{ color: '#ffffff', stroke: '#ffffff' }} />}
          </button>
        </div>
        <input
          type="file"
          ref={fileRef}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt"
          onChange={(e) => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }}
        />
      </div>
      <p className="input-hint">Press Enter to send · Shift+Enter for new line · Upload PDFs, DOCX, or TXT</p>
    </div>
  );
}

/* ──────────────────────────── Dashboard ─────────────────────────── */
function Dashboard({ user, token, onLogout }) {
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [error, setError] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [deleteRunId, setDeleteRunId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getUploadedFiles = () => {
    const files = [];
    messages.forEach((m) => {
      if (m.content && m.content.startsWith('[SYSTEM] Uploaded and processed file:')) {
        const match = m.content.match(/'([^']+)'/);
        if (match && match[1]) {
          files.push(match[1]);
        }
      }
    });
    return [...new Set(files)];
  };
  const uploadedFiles = getUploadedFiles();

  const handleStartEdit = (msgId, currentContent) => {
    setEditingMessageId(msgId);
    setEditText(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (msgId, newContent) => {
    if (!newContent.trim()) return;
    const oldMessages = [...messages];
    setEditingMessageId(null);
    setAgentLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/agent/run/${activeRunId}/message/${msgId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ content: newContent }),
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to update message');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentAssistantText = '';
      let currentMessages = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Normalize CRLF to LF for consistent splitting across platforms
        const normalized = buffer.replace(/\r\n/g, '\n');
        const parts = normalized.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName = 'message';
          let dataVal = '';

          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataVal = line.slice(5).trim();
            }
          }

          if (eventName === 'status') {
            const data = JSON.parse(dataVal);
            if (data.messages) {
              currentMessages = data.messages.map((f, idx) => {
                const local = oldMessages[idx];
                let key = f.id;
                if (local && (local.id === f.id || local.role === f.role)) {
                  key = local.key || local.id;
                }
                return { ...f, key };
              });
            }
            setMessages(currentMessages);
          } else if (eventName === 'token') {
            currentAssistantText += dataVal;
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg && lastMsg.id === 'streaming_assistant') {
              currentMessages[currentMessages.length - 1] = {
                ...lastMsg,
                content: currentAssistantText,
              };
            } else {
              currentMessages.push({
                id: 'streaming_assistant',
                key: 'streaming_assistant',
                role: 'assistant',
                content: currentAssistantText,
                created_at: new Date().toISOString(),
              });
            }
            setMessages([...currentMessages]);
          } else if (eventName === 'tool_start') {
            const data = JSON.parse(dataVal);
            currentMessages.push({
              id: 'tool_call_' + Date.now() + '_' + data.tool_name,
              role: 'tool_call',
              tool_name: data.tool_name,
              tool_data: { args: data.input },
              created_at: new Date().toISOString(),
            });
            currentAssistantText = '';
            setMessages([...currentMessages]);
          } else if (eventName === 'tool_end') {
            const data = JSON.parse(dataVal);
            currentMessages.push({
              id: 'tool_result_' + Date.now() + '_' + data.tool_name,
              role: 'tool_result',
              tool_name: data.tool_name,
              content: data.output,
              created_at: new Date().toISOString(),
            });
            setMessages([...currentMessages]);
          } else if (eventName === 'error') {
            const data = JSON.parse(dataVal);
            setError(data.detail || 'Streaming error occurred');
          } else if (eventName === 'done') {
            const data = JSON.parse(dataVal);
            if (data.assistant_message_id) {
              const lastIdx = currentMessages.length - 1;
              if (lastIdx >= 0 && currentMessages[lastIdx].role === 'assistant') {
                currentMessages[lastIdx] = {
                  ...currentMessages[lastIdx],
                  id: data.assistant_message_id
                };
              }
            }
            await fetchMessages(activeRunId, false);
          }
        }
      }
    } catch (err) {
      setError(err.message);
      await fetchMessages(activeRunId, false);
    } finally {
      setAgentLoading(false);
      setEditText('');
    }
  };

  /* load runs on mount */
  useEffect(() => {
    fetchRuns();
  }, []);

  /* load messages when activeRunId changes */
  useEffect(() => {
    if (activeRunId) fetchMessages(activeRunId, true);
    else setMessages([]);
  }, [activeRunId]);

  async function fetchRuns() {
    setSidebarLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agent/runs`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
        if (data.length > 0 && !activeRunId) setActiveRunId(data[0].id);
      }
    } catch {
      setError('Failed to load sessions.');
    } finally {
      setSidebarLoading(false);
    }
  }

  async function fetchMessages(runId, showSkeleton = false) {
    if (showSkeleton) setMessagesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agent/run/${runId}/messages`, {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const fetched = await res.json();
        setMessages((prev) => {
          if (prev.length === 0) return fetched;
          const keyMap = new Map();
          prev.forEach((m) => {
            if (m.id) keyMap.set(String(m.id), m.key || m.id);
          });

          return fetched.map((f, idx) => {
            let key = keyMap.get(String(f.id));
            if (!key) {
              const local = prev[idx];
              if (local && (local.id === f.id || local.role === f.role)) {
                key = local.key || local.id;
              } else {
                key = f.id;
              }
            }
            return { ...f, key };
          });
        });
      }
    } catch {
      setError('Failed to load messages.');
    } finally {
      if (showSkeleton) setMessagesLoading(false);
    }
  }

  // New Session Modal State
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [newRunGoal, setNewRunGoal] = useState('General assistant');

  async function handleNewRun() {
    setShowNewRunModal(true);
  }

  async function handleCreateRun() {
    const goal = newRunGoal.trim();
    if (!goal) return;
    setShowNewRunModal(false);
    setNewRunGoal('General assistant');
    try {
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ goal }),
      });
      if (res.ok) {
        const data = await res.json();
        setRuns((prev) => [data, ...prev]);
        setActiveRunId(data.id);
        setMessages([]);
      }
    } catch {
      setError('Failed to create session.');
    }
  }

  async function handleDeleteRun(runId) {
    setDeleteRunId(runId);
  }

  async function confirmDeleteRun() {
    if (!deleteRunId) return;
    try {
      const res = await fetch(`${API_BASE}/agent/run/${deleteRunId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setRuns((prev) => prev.filter((r) => r.id !== deleteRunId));
      if (activeRunId === deleteRunId) {
        const remaining = runs.filter((r) => r.id !== deleteRunId);
        setActiveRunId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch {
      setError('Failed to delete session.');
    } finally {
      setDeleteRunId(null);
    }
  }


  async function handleSendMessage(content) {
    if (!activeRunId) { setError('Please create or select a session first.'); return; }

    const clientKey = 'msg-' + Date.now();
    const tempMsg = { 
      id: clientKey, 
      key: clientKey, 
      role: 'user', 
      content, 
      tool_name: null, 
      created_at: new Date().toISOString() 
    };
    setMessages((prev) => [...prev, tempMsg]);
    setAgentLoading(true);
    setError('');

    // FIX #5: Use a ref so the streaming loop always works with live message state,
    // not a stale closure snapshot captured at function-call time.
    const liveMessages = { current: [...messages, tempMsg] };

    // FIX #4: 2-minute hard timeout — prevents input from staying permanently disabled
    // if the stream drops without sending a 'done' event.
    let streamTimedOut = false;
    const streamTimeout = setTimeout(() => {
      streamTimedOut = true;
      setAgentLoading(false);
      setError('Response timed out. The server may be busy — please try again.');
    }, 120000);

    try {
      const res = await fetch(`${API_BASE}/agent/run/${activeRunId}/message/stream`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Agent error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentAssistantText = '';

      while (!streamTimedOut) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Normalize CRLF to LF for consistent splitting across platforms
        const normalized = buffer.replace(/\r\n/g, '\n');
        const parts = normalized.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName = 'message';
          let dataVal = '';

          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataVal = line.slice(5).trim();
            }
          }

          if (eventName === 'status') {
            const data = JSON.parse(dataVal);
            liveMessages.current = liveMessages.current.map((m) =>
              m.key === clientKey ? { ...m, id: data.user_message_id } : m
            );
            setMessages(liveMessages.current);
          } else if (eventName === 'token') {
            currentAssistantText += dataVal;
            const lastMsg = liveMessages.current[liveMessages.current.length - 1];
            if (lastMsg && (lastMsg.key === 'streaming_assistant' || lastMsg.id === 'streaming_assistant')) {
              liveMessages.current[liveMessages.current.length - 1] = {
                ...lastMsg,
                content: currentAssistantText,
              };
            } else {
              liveMessages.current.push({
                id: 'streaming_assistant',
                key: 'streaming_assistant',
                role: 'assistant',
                content: currentAssistantText,
                created_at: new Date().toISOString(),
              });
            }
            setMessages([...liveMessages.current]);
          } else if (eventName === 'tool_start') {
            const data = JSON.parse(dataVal);
            liveMessages.current.push({
              id: 'tool_call_' + Date.now() + '_' + data.tool_name,
              role: 'tool_call',
              tool_name: data.tool_name,
              tool_data: { args: data.input },
              created_at: new Date().toISOString(),
            });
            currentAssistantText = '';
            setMessages([...liveMessages.current]);
          } else if (eventName === 'tool_end') {
            const data = JSON.parse(dataVal);
            liveMessages.current.push({
              id: 'tool_result_' + Date.now() + '_' + data.tool_name,
              role: 'tool_result',
              tool_name: data.tool_name,
              content: data.output,
              created_at: new Date().toISOString(),
            });
            setMessages([...liveMessages.current]);
          } else if (eventName === 'error') {
            const data = JSON.parse(dataVal);
            setError(data.detail || 'Streaming error occurred');
          } else if (eventName === 'done') {
            const data = JSON.parse(dataVal);
            if (data.assistant_message_id) {
              const lastIdx = liveMessages.current.length - 1;
              if (lastIdx >= 0 && liveMessages.current[lastIdx].role === 'assistant') {
                liveMessages.current[lastIdx] = {
                  ...liveMessages.current[lastIdx],
                  id: data.assistant_message_id
                };
              }
            }
            await fetchMessages(activeRunId, false);
          }
        }
      }
    } catch (err) {
      if (!streamTimedOut) {
        setError(err.message);
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        await fetchMessages(activeRunId, false);
      }
    } finally {
      clearTimeout(streamTimeout);
      setAgentLoading(false);
    }
  }

  async function handleUpload(file) {
    if (!activeRunId) { setError('Please create or select a session first.'); return; }

    const formData = new FormData();
    formData.append('file', file);
    setUploadNotice(`Uploading "${file.name}"…`);

    try {
      const res = await fetch(`${API_BASE}/agent/run/${activeRunId}/upload-file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setUploadNotice(`✅ "${d.filename}" uploaded successfully!`);
        await fetchMessages(activeRunId, false);
        setTimeout(() => setUploadNotice(''), 4000);
      } else {
        const d = await res.json();
        throw new Error(d.detail || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
      setUploadNotice('');
    }
  }

  return (
    <div className="dashboard">
      <Sidebar
        token={token}
        runs={runs}
        activeRunId={activeRunId}
        onSelectRun={(id) => setActiveRunId(id)}
        onNewRun={handleNewRun}
        onDeleteRun={handleDeleteRun}
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        loading={sidebarLoading}
      />

      {sidebarOpen && (
        <div className="sidebar-overlay mobile-only" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="chat-area">
        {/* Header */}
        <div className="chat-header glass-panel">
          <div className="chat-header-left">
            <button className="sidebar-toggle-btn mobile-only icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
              <Menu size={18} />
            </button>
            <Bot size={20} />
            <div>
              <div className="chat-header-title">
                {activeRunId
                  ? (runs.find((r) => r.id === activeRunId)?.goal || `Session #${activeRunId}`)
                  : 'Select or Create a Session'}
              </div>
              <div className="chat-header-sub">
                {!isOnline ? 'Offline (Check connection)' : agentLoading ? 'Agent is thinking…' : 'Ready'}
              </div>
            </div>
          </div>
          <div className={`status-dot ${!isOnline ? 'offline' : agentLoading ? 'thinking' : 'ready'}`} title={!isOnline ? 'Offline' : agentLoading ? 'Agent is thinking' : 'Agent is ready'} />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {/* Upload Notice */}
        {uploadNotice && (
          <div className="upload-notice">
            {uploadNotice.startsWith('✅') ? <span className="success-dot">●</span> : <Loader2 size={14} className="spin-icon" />}
            {uploadNotice}
          </div>
        )}

        {/* Uploaded Files Bar */}
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-bar">
            <span className="files-bar-label">Documents ({uploadedFiles.length}):</span>
            <div className="files-pills">
              {uploadedFiles.map((fname, idx) => (
                <span key={idx} className="file-pill" title={fname}>
                  <FileText size={12} />
                  <span className="file-pill-name">{fname}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ChatWindow 
          messages={messages.filter(m => !m.content?.startsWith('[SYSTEM]'))} 
          loading={agentLoading}
          messagesLoading={messagesLoading}
          editingMessageId={editingMessageId}
          editText={editText}
          setEditText={setEditText}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
        />

        {/* Input */}
        {activeRunId ? (
          <MessageInput
            onSend={handleSendMessage}
            onUpload={handleUpload}
            disabled={agentLoading}
          />
        ) : (
          <div className="no-session-hint">
            👆 Create a new session from the sidebar to start chatting
          </div>
        )}

        {/* New Session Modal */}
        {showNewRunModal && (
          <div className="modal-overlay" onClick={() => setShowNewRunModal(false)}>
            <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">New Session</h3>
              <p className="modal-subtitle">What would you like this session to focus on?</p>
              <input
                type="text"
                className="input-field modal-input"
                placeholder="e.g. Python help, Data analysis, General assistant..."
                value={newRunGoal}
                onChange={(e) => setNewRunGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRun(); }}
                autoFocus
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowNewRunModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateRun} disabled={!newRunGoal.trim()}>Create Session</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Session Confirmation Modal */}
        {deleteRunId !== null && (
          <div className="modal-overlay" onClick={() => setDeleteRunId(null)}>
            <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title" style={{ color: 'var(--accent-red, #ff4d4f)' }}>Delete Session</h3>
              <p className="modal-subtitle">Are you sure you want to delete this session? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteRunId(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-red, #ff4d4f)', borderColor: 'var(--accent-red, #ff4d4f)' }} onClick={confirmDeleteRun}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

  );
}

export default Dashboard;
