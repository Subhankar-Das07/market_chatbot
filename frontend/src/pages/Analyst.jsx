import { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import SessionsList from '../components/SessionsList';
import { fetchSessions, createSession, updateSession, deleteSession } from '../api/api';

export default function Analyst() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const loadSessions = () => {
    fetchSessions().then(res => {
      if (res.data) {
        setSessions(res.data);
        if (res.data.length > 0 && !activeSessionId) {
          setActiveSessionId(res.data[0]._id);
        }
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewSession = async () => {
    try {
      const res = await createSession('New Conversation');
      setSessions([res.data, ...sessions]);
      setActiveSessionId(res.data._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameSession = async (id, newTitle) => {
    try {
      await updateSession(id, { title: newTitle });
      setSessions(sessions.map(s => s._id === id ? { ...s, title: newTitle } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await deleteSession(id);
      const updated = sessions.filter(s => s._id !== id);
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0]._id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSessionChange = (id) => {
    setActiveSessionId(id);
    // Reload sessions to bump it to top if we want, or just let local state be
    if (!sessions.find(s => s._id === id)) {
      loadSessions();
    }
  };

  return (
    <div className="page-content" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h2>AI Financial Analyst</h2>
        <p>RAG-powered analysis grounded in your uploaded market reports</p>
      </div>

      <div className="analyst-layout" style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
        <SessionsList 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          onRename={handleRenameSession}
        />

        <ChatBox 
          sessionId={activeSessionId} 
          onSessionChange={handleSessionChange}
          onNewSession={handleNewSession}
        />
      </div>
    </div>
  );
}
