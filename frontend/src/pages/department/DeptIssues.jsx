import { useState } from 'react';
import { COMPLAINTS, CATEGORIES, formatDateTime } from '../../data/mockData';
import { StatusBadge, PriorityBadge, CategoryChip, ConfirmDialog } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { Search, X, Clock, CheckCircle } from 'lucide-react';

export default function DeptIssues() {
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ priority: '', status: '', deadline: '' });
  const [confirmResolve, setConfirmResolve] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [statusModal, setStatusModal] = useState(null);

  const issues = COMPLAINTS.filter(c => c.assignedTo === 'pwd' && c.status !== 'resolved');
  const filtered = issues.filter(c =>
    (!search || c.id.includes(search) || c.title.toLowerCase().includes(search.toLowerCase())) &&
    (!filters.priority || c.priority === filters.priority) &&
    (!filters.status || c.status === filters.status)
  );

  const handleAccept = (id) => addToast(`${id} — Status updated to In Progress`, 'success');
  const handleResolve = () => {
    if (!resolveNote) { addToast('Please add a resolution note', 'warning'); return; }
    addToast(`${confirmResolve} resolved successfully`, 'success');
    setConfirmResolve(null); setResolveNote('');
  };

  const timeRemaining = (deadline) => {
    const diff = new Date(deadline) - Date.now();
    if (diff < 0) return { text: 'Overdue', color: 'var(--color-danger)' };
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return { text: `${hrs}h remaining`, color: 'var(--color-warning)' };
    return { text: `${Math.floor(hrs / 24)}d remaining`, color: 'var(--color-success)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 140 }} value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All Priority</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Status</option>
          {['submitted','verified','assigned','inprogress','escalated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={filters.deadline} onChange={e => setFilters(p => ({ ...p, deadline: e.target.value }))}>
          <option value="">All Deadlines</option>
          <option value="today">Due Today</option>
          <option value="week">Due This Week</option>
          <option value="overdue">Overdue</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ priority: '', status: '', deadline: '' })}>
          <X size={13} /> Reset
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{filtered.length} assigned issues</span>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue ID</th><th>Category</th><th>Priority</th><th>Location</th>
                <th>Assigned Date</th><th>SLA Deadline</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sla = timeRemaining(c.slaDeadline);
                return (
                  <tr key={c.id} className={c.priority === 'high' ? 'high-priority' : ''}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)', fontWeight: 700 }}>{c.id}</span></td>
                    <td><CategoryChip category={c.category} /></td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td style={{ fontSize: 13 }}>{c.ward}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{formatDateTime(c.submittedAt)}</td>
                    <td>
                      <div>
                        <p style={{ fontSize: 12 }}>{formatDateTime(c.slaDeadline)}</p>
                        <p style={{ fontSize: 11, color: sla.color, fontWeight: 600, marginTop: 2 }}>
                          <Clock size={10} style={{ marginRight: 3 }} />{sla.text}
                        </p>
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {c.status === 'assigned' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleAccept(c.id)} style={{ padding: '4px 8px' }}>Accept</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setStatusModal(c)} style={{ padding: '4px 8px' }}>Update</button>
                        <button className="btn btn-success btn-sm" onClick={() => setConfirmResolve(c.id)} style={{ padding: '4px 8px' }}>
                          <CheckCircle size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Status Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Update Status — {statusModal.id}</span>
              <button onClick={() => setStatusModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select">
                  <option value="inprogress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <textarea className="form-textarea" placeholder="Add a note..." rows={3} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { addToast(`Status updated for ${statusModal.id}`, 'success'); setStatusModal(null); }}>Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve confirmation */}
      {confirmResolve && (
        <div className="modal-overlay" onClick={() => setConfirmResolve(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Mark as Resolved — {confirmResolve}</span>
              <button onClick={() => setConfirmResolve(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Resolution Note *</label>
                <textarea className="form-textarea" placeholder="Describe what was done to resolve this issue..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={4} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmResolve(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleResolve}><CheckCircle size={14} /> Mark Resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
