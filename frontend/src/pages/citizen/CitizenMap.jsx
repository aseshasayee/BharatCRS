import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLAINTS, CATEGORIES } from '../../data/mockData';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { X, ExternalLink, ThumbsUp, MapPin } from 'lucide-react';

export default function CitizenMap() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ category: '', priority: '', status: '' });
  const [upvoted, setUpvoted] = useState({});

  const filtered = COMPLAINTS.filter(c =>
    (!filters.category || c.category === filters.category) &&
    (!filters.priority || c.priority === filters.priority) &&
    (!filters.status || c.status === filters.status)
  );

  const upvote = (id) => {
    setUpvoted(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', gap: 0, margin: '-32px', position: 'relative' }}>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 10, padding: '12px 24px', flexWrap: 'wrap',
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-neutral-200)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <select className="form-select" style={{ width: 'auto' }} value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {['submitted','verified','assigned','inprogress','resolved','escalated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-600)', alignSelf: 'center', marginLeft: 'auto' }}>
          {filtered.length} issue{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent complaints={filtered} height="100%" onPinClick={setSelected} />

        {/* Detail panel */}
        {selected && (
          <div style={{
            position: 'absolute', top: 16, right: 16, width: 340,
            background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-high)',
            border: '1px solid var(--color-neutral-200)',
            zIndex: 400, overflow: 'hidden',
            animation: 'slideInRight 0.2s ease',
          }}>
            <div style={{ background: 'var(--color-neutral-100)', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
              <MapPin size={40} color="var(--color-primary)" />
            </div>
            <button onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <X size={14} />
            </button>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{selected.title}</p>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginBottom: 12 }}>{selected.description}</p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {selected.location}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => upvote(selected.id)}
                  className="btn btn-sm"
                  style={{
                    gap: 6, flex: 1,
                    background: upvoted[selected.id] ? 'var(--color-danger-light)' : 'var(--color-neutral-100)',
                    color: upvoted[selected.id] ? 'var(--color-danger)' : 'var(--color-neutral-700)',
                    border: '1px solid', borderColor: upvoted[selected.id] ? 'var(--color-danger)' : 'var(--color-neutral-200)',
                  }}>
                  <ThumbsUp size={13} /> {selected.upvotes + (upvoted[selected.id] ? 1 : 0)} Report too
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/citizen/tracking/${selected.id}`)} style={{ gap: 6 }}>
                  <ExternalLink size={13} /> Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
