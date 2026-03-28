import { useState, useEffect } from 'react';
import { complaintService } from '../../services/complaintService';
import { mapComplaint, DEPARTMENTS } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { useApp } from '../../context/AppContext';
import { X, RefreshCw, AlertTriangle, UserCheck, MapPin, Circle } from 'lucide-react';

export default function AdminLiveMap() {
  const { addToast } = useApp();
  const [allComplaints, setAllComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deptFilter, setDeptFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = () => {
    complaintService.listComplaints({ limit: 200 })
      .then(data => setAllComplaints((data || []).map(mapComplaint)))
      .catch(console.error);
    setLastRefresh(new Date());
  };

  useEffect(() => { fetchData(); }, []);

  const highUnassigned = allComplaints.filter(c => (c.priority === 'High' || c.priority === 'Critical') && !c.department).length;

  const filtered = allComplaints.filter(c =>
    (viewMode === 'all') ||
    (viewMode === 'unassigned' && !c.department) ||
    (viewMode === 'dept' && deptFilter.length === 0) ||
    (viewMode === 'dept' && deptFilter.includes(c.department))
  ).filter(c => !priorityFilter || c.priority?.toLowerCase() === priorityFilter.toLowerCase());

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', margin: '-32px', overflow: 'hidden' }}>
      {/* Left control panel */}
      <div style={{ width: 260, background: 'white', borderRight: '1px solid var(--color-neutral-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        {/* Stats header */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 700 }}>Live Map Controls</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--color-primary-light)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{filtered.length}</span>
              <span style={{ color: 'var(--color-neutral-600)', marginLeft: 4 }}>Active</span>
            </div>
            {highUnassigned > 0 && (
              <div style={{ background: 'var(--color-danger-light)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{highUnassigned}</span>
                <span style={{ color: 'var(--color-neutral-600)', marginLeft: 4 }}>Unassigned High</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* View mode */}
          <div>
            <label className="form-label">View Mode</label>
            {[['all', 'All Issues'], ['unassigned', 'Unassigned Only'], ['dept', 'By Department']].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, fontSize: 13 }}>
                <input type="radio" name="viewMode" value={val} checked={viewMode === val} onChange={() => setViewMode(val)} />
                {label}
              </label>
            ))}
          </div>

          {/* Department multi-select */}
          <div>
            <label className="form-label">Departments</label>
            {DEPARTMENTS.map(d => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6, fontSize: 12 }}>
                <input type="checkbox" checked={deptFilter.includes(d)}
                  onChange={() => setDeptFilter(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} />
                {d.split(' ')[0]}
              </label>
            ))}
          </div>

          {/* Priority filter */}
          <div>
            <label className="form-label">Priority</label>
            {[['', 'All'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']].map(([val, label]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6, fontSize: 13 }}>
                <input type="radio" name="prio" value={val} checked={priorityFilter === val} onChange={() => setPriorityFilter(val)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Refresh */}
        <div style={{ padding: 16, borderTop: '1px solid var(--color-neutral-100)' }}>
          <button className="btn btn-secondary btn-full btn-sm" onClick={() => { fetchData(); addToast('Map refreshed', 'info'); }}>
            <RefreshCw size={13} /> Refresh Now
          </button>
          <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 6, textAlign: 'center' }}>
            Last: {lastRefresh.toLocaleTimeString('en-IN')}
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent complaints={filtered} height="100%" onPinClick={setSelected} />

        {/* Issue detail slide-in */}
        {selected && (
          <div style={{
            position: 'absolute', top: 16, right: 16, width: 320,
            background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-high)',
            zIndex: 400, overflow: 'hidden',
            animation: 'slideInRight 0.2s ease',
          }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{selected.id}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-600)' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{selected.title}</p>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginBottom: 8 }}>{selected.description}</p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {selected.location}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, gap: 6 }}
                  onClick={() => { addToast(`${selected.id} assigned`, 'success'); setSelected(null); }}>
                  <UserCheck size={13} /> Assign
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, gap: 6 }}
                  onClick={() => { addToast(`${selected.id} escalated`, 'warning'); setSelected(null); }}>
                  <AlertTriangle size={13} /> Escalate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pin legend */}
        <div style={{ position: 'absolute', bottom: 24, right: 16, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', backdropFilter: 'blur(4px)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-neutral-600)' }}>Pin Legend</p>
          {[[<Circle size={10} fill="var(--color-danger)" color="var(--color-danger)" />, 'High Priority'], [<Circle size={10} fill="var(--color-warning)" color="var(--color-warning)" />, 'Medium Priority'], [<Circle size={10} fill="var(--color-success)" color="var(--color-success)" />, 'Resolved'], [<Circle size={10} fill="var(--color-neutral-800)" color="var(--color-neutral-800)" />, 'New/Unverified']].map(([icon, label], i) => (
            <p key={i} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>{icon} {label}</p>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
