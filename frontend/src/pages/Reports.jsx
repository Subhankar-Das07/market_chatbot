import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Search, RefreshCw, CheckCircle, AlertCircle, Clock, Edit2, Play, Check, X, FileSearch } from 'lucide-react';
import { fetchReports, uploadReport, deleteReport, updateReport, reindexReport, getReportSummary } from '../api/api';

const SECTOR_COLORS = {
  Technology: '#dbeafe',
  Finance: '#dcfce7',
  Energy: '#fef3c7',
  Healthcare: '#fce7f3',
  Auto: '#e0e7ff',
  'Real Estate': '#f3e8ff',
  Default: '#f1f5f9',
};
const SECTOR_TEXT = {
  Technology: '#1d4ed8',
  Finance: '#15803d',
  Energy: '#92400e',
  Healthcare: '#9d174d',
  Auto: '#4338ca',
  'Real Estate': '#7c3aed',
  Default: '#475569',
};

const STATUS_ICONS = {
  indexed: <CheckCircle size={14} color="var(--color-success)" />,
  pending: <Clock size={14} color="var(--color-warning)" />,
  failed: <AlertCircle size={14} color="var(--color-error)" />,
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [toast, setToast] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSector, setEditSector] = useState('');

  const [summaryLoadingId, setSummaryLoadingId] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null);
  
  const fileRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports({
        sector: filterSector || undefined,
        status: filterStatus || undefined,
        search: search || undefined
      });
      setReports(res.data || []);
    } catch {
      setReports([]);
    }
    setLoading(false);
  };

  // Poll for status updates if any are pending
  useEffect(() => {
    loadReports();
    
    const interval = setInterval(() => {
      setReports(currentReports => {
        if (currentReports.some(r => r.embedding_status === 'pending')) {
          loadReports(); // Only refetch if there are pending jobs
        }
        return currentReports;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSector, filterStatus, search]);

  const handleUpload = async (files) => {
    const file = files[0];
    if (!file) return;
    const allowed = ['application/pdf', 'text/csv', 'text/plain'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|csv|txt)$/i)) {
      showToast('Only PDF, CSV, and TXT files are supported.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await uploadReport(fd);
      showToast(`✓ "${file.name}" uploaded and queued for indexing`);
      loadReports();
    } catch (e) {
      showToast(`✗ Upload failed: ${e.response?.data?.detail || e.message}`);
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r._id !== id));
      showToast('Report deleted.');
    } catch {
      showToast('Failed to delete report.');
    }
  };

  const handleReindex = async (id) => {
    try {
      await reindexReport(id);
      showToast('Re-indexing started.');
      setReports(prev => prev.map(r => r._id === id ? { ...r, embedding_status: 'pending' } : r));
    } catch {
      showToast('Failed to start re-indexing.');
    }
  };

  const startEdit = (report) => {
    setEditingId(report._id);
    setEditTitle(report.title);
    setEditSector(report.sector || 'General');
  };

  const saveEdit = async (id) => {
    try {
      await updateReport(id, { title: editTitle, sector: editSector });
      setReports(prev => prev.map(r => r._id === id ? { ...r, title: editTitle, sector: editSector } : r));
      setEditingId(null);
      showToast('Report updated.');
    } catch {
      showToast('Failed to update report.');
    }
  };

  const handleViewSummary = async (report) => {
    setSummaryLoadingId(report._id);
    try {
      const res = await getReportSummary(report._id);
      setActiveSummary({ title: report.title, text: res.data.summary });
    } catch (err) {
      showToast('Failed to generate summary.');
    }
    setSummaryLoadingId(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Market Reports</h2>
            <p>Upload and manage your research documents for AI-powered analysis</p>
          </div>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Upload Report
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.csv,.txt"
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px' }} />
            <p>Uploading and indexing document…</p>
          </div>
        ) : (
          <>
            <Upload size={40} />
            <p><strong>Drag & drop</strong> or <strong>click to browse</strong></p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Supports PDF, CSV, TXT — max 20MB</p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
        <input 
          type="text" 
          id="url-ingest-input"
          placeholder="https://example.com/market-article" 
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--color-outline)' }} 
        />
        <button 
          className="btn btn-secondary" 
          onClick={async () => {
            const el = document.getElementById('url-ingest-input');
            if(!el.value) return;
            setUploading(true);
            try {
              import('../api/api').then(m => m.uploadUrl(el.value)).then(() => {
                showToast(`✓ URL queued for ingestion`);
                el.value = '';
                loadReports();
                setUploading(false);
              }).catch(e => {
                showToast(`✗ URL ingestion failed`);
                setUploading(false);
              });
            } catch(e) {}
          }}
        >
          Ingest URL
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports by title..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid var(--color-outline)',
              borderRadius: 'var(--radius)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        
        <select 
          value={filterSector} 
          onChange={e => setFilterSector(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius)', outline: 'none' }}
        >
          <option value="">All Sectors</option>
          {Object.keys(SECTOR_COLORS).filter(s => s !== 'Default').map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="General">General</option>
        </select>
        
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius)', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="indexed">Indexed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <button className="btn btn-secondary btn-sm" onClick={loadReports}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Reports Grid */}
      {loading && reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-slate)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Loading reports…</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-slate)' }}>
          <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>No reports found</p>
          <p style={{ fontSize: '14px' }}>Upload a new report or adjust your filters.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map(report => {
            const isEditing = editingId === report._id;
            const sectorBg = SECTOR_COLORS[report.sector] || SECTOR_COLORS.Default;
            const sectorTxt = SECTOR_TEXT[report.sector] || SECTOR_TEXT.Default;
            
            return (
              <div key={report._id} className="report-card">
                <div className="report-card-header">
                  {isEditing ? (
                    <select 
                      value={editSector} 
                      onChange={e => setEditSector(e.target.value)}
                      style={{ fontSize: '12px', padding: '2px', border: '1px solid var(--color-outline)', borderRadius: '3px' }}
                    >
                      {Object.keys(SECTOR_COLORS).filter(s => s !== 'Default').map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="General">General</option>
                    </select>
                  ) : (
                    <span className="report-sector" style={{ background: sectorBg, color: sectorTxt, padding: '2px 8px', borderRadius: '4px' }}>
                      {report.sector || 'General'}
                    </span>
                  )}
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {!isEditing && (
                      <>
                        <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => startEdit(report)} title="Edit metadata">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => handleViewSummary(report)} title="View AI Summary">
                          {summaryLoadingId === report._id ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <FileSearch size={14} />}
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost" style={{ padding: '4px', color: 'var(--color-error)' }} onClick={() => handleDelete(report._id)} title="Delete report">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <input 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)} 
                      style={{ flex: 1, fontSize: '14px', padding: '4px', border: '1px solid var(--color-blue)', borderRadius: '4px', outline: 'none' }} 
                    />
                    <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => saveEdit(report._id)}><Check size={14} /></button>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="report-title">{report.title}</div>
                )}
                
                {report.summary && !isEditing && <div className="report-summary">{report.summary}</div>}
                
                <div className="report-meta">
                  {STATUS_ICONS[report.embedding_status] || STATUS_ICONS.pending}
                  <span style={{ textTransform: 'capitalize' }}>
                    {report.embedding_status || 'pending'} 
                    {report.chunk_count > 0 && ` (${report.chunk_count} chunks)`}
                  </span>
                  
                  {report.embedding_status === 'failed' && (
                    <button className="btn btn-ghost" style={{ padding: '2px', marginLeft: '4px' }} onClick={() => handleReindex(report._id)} title="Retry indexing">
                      <Play size={12} />
                    </button>
                  )}
                  
                  <span style={{ marginLeft: 'auto' }}>
                    {report.uploaded_date ? new Date(report.uploaded_date).toLocaleDateString() : 'Unknown date'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* Summary Modal */}
      {activeSummary && (
        <div className="modal-overlay" onClick={() => setActiveSummary(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Executive Summary</h3>
              <button className="btn btn-ghost" onClick={() => setActiveSummary(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <h4 style={{ marginBottom: '12px', color: 'var(--color-text)' }}>{activeSummary.title}</h4>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--color-slate)' }}>
                {activeSummary.text}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setActiveSummary(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
