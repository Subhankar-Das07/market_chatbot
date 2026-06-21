import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function MessageBubble({ msg, onRegenerate, onFeedback }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(msg.feedback || null);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type) => {
    const newFeedback = feedback === type ? 'none' : type;
    setFeedback(newFeedback);
    if (onFeedback && msg._id) {
      onFeedback(msg._id, newFeedback);
    }
  };

  const isAi = msg.role === 'assistant';

  // Render markdown safely
  const rawMarkup = isAi ? marked.parse(msg.content || '') : '';
  const cleanMarkup = DOMPurify.sanitize(rawMarkup);

  return (
    <div className={`chat-bubble ${msg.role}`}>
      <div className={`bubble-avatar ${isAi ? 'ai' : 'user'}`}>
        {isAi ? 'AI' : 'U'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="bubble-content">
          {msg.streaming && msg.content === '' ? (
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          ) : isAi ? (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: cleanMarkup }}
            />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
              {msg.content}
            </pre>
          )}
        </div>

        {/* Sources display */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="bubble-sources">
            <span style={{ fontSize: '11px', color: 'var(--color-slate)', marginRight: '4px' }}>
              Sources:
            </span>
            {msg.sources.map((src, j) => (
              <span key={j} className="source-tag">{src}</span>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div className="bubble-actions-row">
          <div className="bubble-timestamp">
            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
            {isAi && msg.response_time_ms && ` • ${(msg.response_time_ms / 1000).toFixed(1)}s`}
          </div>
          
          {isAi && !msg.streaming && (
            <div className="bubble-actions">
              <button 
                className="action-btn" 
                onClick={handleCopy} 
                title="Copy message"
              >
                {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              </button>
              
              {onRegenerate && (
                <button 
                  className="action-btn" 
                  onClick={onRegenerate}
                  title="Regenerate response"
                >
                  <RefreshCw size={14} />
                </button>
              )}
              
              <div className="action-divider" />
              
              <button 
                className={`action-btn ${feedback === 'up' ? 'active-up' : ''}`}
                onClick={() => handleFeedback('up')}
                title="Good response"
              >
                <ThumbsUp size={14} />
              </button>
              
              <button 
                className={`action-btn ${feedback === 'down' ? 'active-down' : ''}`}
                onClick={() => handleFeedback('down')}
                title="Bad response"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
