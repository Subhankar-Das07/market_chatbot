import { useEffect, useRef, useState } from 'react';
import { Send, BrainCircuit, Trash2, Download } from 'lucide-react';
import { sendChatMessage, fetchSessionMessages, createSession, messageFeedback } from '../api/api';
import MessageBubble from './MessageBubble';

const SUGGESTIONS = [
  'Analyze Q3 tech sector earnings impact',
  'Compare EU renewable energy subsidies',
  'APAC semiconductor supply chain risks',
  'Impact of 50bps Fed rate hike on REITs',
];

export default function ChatBox({ sessionId, onSessionChange, onNewSession }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const textareaRef = useRef(null);

  // Load session messages
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    setIsStreaming(false);
    setError(null);
    
    if (sessionId) {
      fetchSessionMessages(sessionId)
        .then(res => {
          setMessages(res.data || []);
        })
        .catch(err => {
          console.error("Failed to load messages", err);
          setMessages([]);
        });
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text = input) => {
    const query = text.trim();
    if (!query || isStreaming) return;

    let currentSessionId = sessionId;
    
    // Auto-create session if none exists
    if (!currentSessionId) {
      try {
        const res = await createSession(query.slice(0, 40) + '...');
        currentSessionId = res.data._id;
        onSessionChange(currentSessionId);
      } catch (err) {
        setError('Failed to create session');
        return;
      }
    }

    const userMsg = { role: 'user', content: query, created_at: new Date().toISOString() };
    const aiMsg  = { role: 'assistant', content: '', created_at: new Date().toISOString(), sources: [], streaming: true };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setIsStreaming(true);
    setError(null);

    let fullText = '';
    let sources = [];

    abortRef.current = sendChatMessage(
      query,
      currentSessionId,
      (chunk) => {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed.type === 'sources') {
            sources = parsed.payload;
            return;
          }
        } catch {}
        fullText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: fullText, sources };
          return updated;
        });
      },
      () => {
        setIsStreaming(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false, sources };
          return updated;
        });
      },
      (err) => {
        setIsStreaming(false);
        setError(err);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `⚠️ Error: ${err}`,
            streaming: false,
          };
          return updated;
        });
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (messageId, feedbackType) => {
    messageFeedback(messageId, feedbackType).catch(console.error);
  };

  const exportChatToMarkdown = () => {
    let md = `# Market Analysis Chat Export\n\n`;
    messages.forEach(msg => {
      md += msg.role === 'user' ? `### User\n` : `### Analyst\n`;
      md += `${msg.content}\n\n`;
      if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
        md += `**Sources:** ${msg.sources.join(', ')}\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market_analysis_export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      {sessionId && messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid var(--color-outline)' }}>
          <button className="btn btn-ghost btn-sm" onClick={exportChatToMarkdown} title="Download Chat as Markdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Download Chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <BrainCircuit size={48} strokeWidth={1} />
            <h3>AI Financial Analyst</h3>
            <p>
              Ask me anything about market trends, earnings reports, sector analysis,
              or your uploaded research documents.
            </p>
            <div className="chat-suggestions" style={{ marginTop: '8px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="suggestion-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble 
              key={msg._id || i} 
              msg={msg} 
              onRegenerate={i === messages.length - 1 && msg.role === 'assistant' ? () => handleSend(messages[i-1].content) : null}
              onFeedback={handleFeedback}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        {error && (
          <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginBottom: '8px' }}>
            {error}
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about market trends, sectors, earnings..."
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            title="Send (Enter)"
          >
            {isStreaming ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : <Send size={16} />}
          </button>
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-slate)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Press Enter to send · Shift+Enter for new line</span>
          <span>AI can make mistakes. Verify important information.</span>
        </div>
      </div>
    </div>
  );
}
