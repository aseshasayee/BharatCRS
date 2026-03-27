import { useState } from 'react';
import { COMPLAINTS, CATEGORIES, DEPARTMENTS, WARDS, formatDateTime, getCategoryById } from '../../data/mockData';
import { StatusBadge, PriorityBadge, CategoryChip, ConfirmDialog } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { Search, Filter, Download, X, Eye, UserCheck, AlertTriangle, MapPin } from 'lucide-react';
import MapComponent from '../../components/MapComponent';

export default function AdminIssues() {
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ priority: '', status: '', category: '', ward: '' });
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null); // { complaint, type }
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [bulkDept, setBulkDept] = useState('');

  const filtered = COMPLAINTS.filter(c =>
    (!search || c.id.includes(search) || c.title.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase())) &&
    (!filters.priority || c.priority === filters.priority) &&
    (!filters.status || c.status === filters.status) &&
    (!filters.category || c.category === filters.category) &&
    (!filters.ward || c.ward === filters.ward)
  );

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === filtered.length ? [] : filtered.map(c => c.id));

  const handleBulkAssign = () => {
    if (!bulkDept) { addToast('Select a department first', 'warning'); return; }
    addToast(`${selected.length} complaints assigned to ${bulkDept}`, 'success');
    setSelected([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter bar */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '14px 20px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
            <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search ID, keyword, location..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 140 }} value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
            <option value="">All Priority</option>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Status</option>
            {['submitted','verified','assigned','inprogress','resolved','escalated'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" style={{ width: 160 }} value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ priority: '', status: '', category: '', ward: '' })}>
            <X size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div style={{
          background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)',
          borderRadius: 10, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)' }}>{selected.length} selected</span>
          <select className="form-select" style={{ width: 200 }} value={bulkDept} onChange={e => setBulkDept(e.target.value)}>
            <option value="">Assign to department...</option>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleBulkAssign}><UserCheck size={13} /> Assign</button>
          <button className="btn btn-danger btn-sm" onClick={() => addToast(`${selected.length} complaints escalated`, 'warning')}><AlertTriangle size={13} /> Escalate</button>
          <button className="btn btn-success btn-sm" onClick={() => addToast(`${selected.length} complaints resolved`, 'success')}>Mark Resolved</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected([])}><X size={13} /></button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{filtered.length} complaints</span>
          <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <Download size={13} /> Export
          </button>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th>Issue ID</th><th>Category</th><th>Priority</th><th>Location</th><th>Submitted</th><th>Status</th><th>Assigned To</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={c.priority === 'high' ? 'high-priority' : ''}>
                  <td><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td>
                    <button onClick={() => setModal({ complaint: c, type: 'view' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                      {c.id}
                    </button>
                  </td>
                  <td><CategoryChip category={c.category} /></td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td style={{ fontSize: 13 }}>{c.ward}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{formatDateTime(c.submittedAt)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td style={{ fontSize: 13 }}>{c.assignedDept || <span style={{ color: 'var(--color-neutral-400)' }}>Unassigned</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setModal({ complaint: c, type: 'view' })} style={{ padding: '4px 8px' }}>
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => setModal({ complaint: c, type: 'assign' })} style={{ padding: '4px 8px' }}>
                        <UserCheck size={13} />
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => addToast(`${c.id} escalated`, 'warning')} style={{ padding: '4px 8px' }}>
                        <AlertTriangle size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--color-neutral-100)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Showing {filtered.length} results</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map(n => (
              <button key={n} className="btn btn-sm" style={{ background: n === 1 ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: n === 1 ? 'white' : 'var(--color-neutral-700)', padding: '4px 10px' }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.complaint.id} — {modal.type === 'assign' ? 'Assign Issue' : 'Issue Details'}</span>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-600)' }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={modal.complaint.status} />
                <PriorityBadge priority={modal.complaint.priority} />
                <CategoryChip category={modal.complaint.category} />
              </div>
              <h3 style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 16 }}>{modal.complaint.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{modal.complaint.description}</p>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {modal.complaint.location}</p>
              <MapComponent complaints={[modal.complaint]} height={180} center={[modal.complaint.lat, modal.complaint.lng]} zoom={15} />
              {modal.type === 'assign' && (
                <div className="form-group">
                  <label className="form-label">Assign to Department</label>
                  <select className="form-select">
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { addToast('Action completed', 'success'); setModal(null); }}>
                {modal.type === 'assign' ? 'Assign' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
