import { MessageSquare, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

export default function SessionsList({ 
  sessions, 
  activeSessionId, 
  onSelect, 
  onNew, 
  onDelete, 
  onRename 
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditStart = (e, session) => {
    e.stopPropagation();
    setEditingId(session._id);
    setEditTitle(session.title);
  };

  const handleEditSave = (e, sessionId) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleEditCancel = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="sessions-sidebar">
      <div className="sessions-header">
        <h3>Chat History</h3>
        <button className="btn btn-primary btn-sm" onClick={onNew} title="New Chat">
          <Plus size={16} /> New
        </button>
      </div>
      
      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="sessions-empty">No previous chats.</div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session._id} 
              className={`session-item ${activeSessionId === session._id ? 'active' : ''}`}
              onClick={() => onSelect(session._id)}
            >
              <MessageSquare size={16} className="session-icon" />
              
              {editingId === session._id ? (
                <div className="session-edit-mode" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(e, session._id);
                      if (e.key === 'Escape') handleEditCancel(e);
                    }}
                  />
                  <button onClick={(e) => handleEditSave(e, session._id)} className="edit-action"><Check size={14} /></button>
                  <button onClick={handleEditCancel} className="edit-action"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="session-title-wrap">
                    <div className="session-title">{session.title}</div>
                    <div className="session-date">
                      {new Date(session.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  {activeSessionId === session._id && (
                    <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => handleEditStart(e, session)} title="Rename">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(session._id); }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
