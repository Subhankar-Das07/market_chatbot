import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://market-chatbot.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  return api.post('/api/auth/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};
export const registerUser = (email, password) => api.post('/api/auth/register', { email, password });
export const getMe = () => api.get('/api/auth/me');

export const checkHealth = () => api.get('/api/health');
export const getStats = () => api.get('/api/stats');

// Reports
export const fetchReports = (params = {}) => api.get('/api/reports', { params });
export const uploadReport = (formData) =>
  api.post('/api/reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const uploadUrl = (url) => api.post('/api/reports/url', { url });
export const deleteReport = (reportId) => api.delete(`/api/reports/${reportId}`);
export const updateReport = (reportId, data) => api.patch(`/api/reports/${reportId}`, data);
export const reindexReport = (reportId) => api.post(`/api/reports/${reportId}/reindex`);
export const getReportSummary = (reportId) => api.get(`/api/reports/${reportId}/summary`);

// Sessions & Messages
export const fetchSessions = (limit = 50, skip = 0) => api.get(`/api/sessions?limit=${limit}&skip=${skip}`);
export const createSession = (title) => api.post('/api/sessions', { title });
export const getSession = (sessionId) => api.get(`/api/sessions/${sessionId}`);
export const updateSession = (sessionId, data) => api.patch(`/api/sessions/${sessionId}`, data);
export const deleteSession = (sessionId) => api.delete(`/api/sessions/${sessionId}`);
export const fetchSessionMessages = (sessionId) => api.get(`/api/sessions/${sessionId}/messages`);
export const messageFeedback = (messageId, feedback) => api.post(`/api/messages/${messageId}/feedback`, { feedback });

// Legacy
export const fetchQueryHistory = (limit = 20) => api.get(`/api/queries?limit=${limit}`);

// Streaming Chat
export const sendChatMessage = (queryText, sessionId, onChunk, onDone, onError) => {
  const controller = new AbortController();
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query_text: queryText, session_id: sessionId }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Server error' }));
      onError(error.detail || 'Request failed');
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const readChunk = async () => {
      const { done, value } = await reader.read();
      if (done) { onDone(); return; }
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const chunk = line.slice(6);
          if (chunk === '[DONE]') { onDone(); return; }
          onChunk(chunk.replace(/\\n/g, '\n'));
        }
      }
      readChunk();
    };
    readChunk();
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err.message || 'Connection error');
  });
  return controller;
};

export default api;
