import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintService } from '../../services/complaintService';
import { mapComplaint } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { X, ExternalLink, ThumbsUp, MapPin } from 'lucide-react';

const DOMAINS = [
  'Core Infrastructure & Public Works',
  'Sanitation, Environment & Parks',
  'Transportation & Traffic',
  'Social Infrastructure & Public Health',
  'Emergency, Safety & Accountability',
  'Urban Planning & Real Estate',
];

export default function CitizenMap() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ domain: '', priority: '', status: '' });
  const [upvoted, setUpvoted] = useState({});

  useEffect(() => {
    complaintService.listComplaints({ limit: 200 })
      .then(data => setComplaints((data || []).map(mapComplaint)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = complaints.filter(c =>
    (!filters.domain || c.domain === filters.domain) &&
    (!filters.priority || c.priority?.toLowerCase() === filters.priority.toLowerCase()) &&
    (!filters.status || c.status === filters.status)
  );

  const handleUpvote = async (id) => {
    try {
      await complaintService.upvoteComplaint(id);
      setUpvoted(p => ({ ...p, [id]: !p[id] }));
    } catch (e) {
      setUpvoted(p => ({ ...p, [id]: !p[id] }));
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', gap: 0, margin: '-32px', position: 'relative' }}>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 10, padding: '12px 24px', flexWrap: 'wrap',
        background: 'var(--color-white)', borderBottom: '1px solid var(--color-neutral-200)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <select className="form-select" style={{ width: 'auto' }} value={filters.domain} onChange={e => setFilters(p => ({ ...p, domain: e.target.value }))}>
          <option value="">All Domains</option>
          {DOMAINS.map(d => <option key={d} value={d}>{d.split('&')[0].trim()}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option><option value="High">High</option>
          <option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {['submitted','verified','assigned','in_progress','resolved'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-600)', alignSelf: 'center', marginLeft: 'auto' }}>
          {loading ? 'Loading...' : `${filtered.length} issue${filtered.length !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent complaints={complaints} height="100%" onPinClick={setSelected} />

        {/* Detail panel */}
        {selected && (
          <div style={{
            position: 'absolute', top: 16, right: 16, width: 340,
            background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-high)',
            border: '1px solid var(--color-neutral-200)',
            zIndex: 400, overflow: 'hidden',
            animation: 'slideInRight 0.2s ease',
          }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              <MapPin size={36} color="rgba(255,255,255,0.9)" />
            </div>
            <button onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <X size={14} />
            </button>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <StatusBadge status={selected.status || selected.common_metadata?.status} />
                <PriorityBadge priority={selected.priority || selected.priority_assessment?.priority_class} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>
                {selected.title || selected.common_metadata?.raw_text}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {selected.ward || selected.common_metadata?.location?.ward_name || 'Chennai'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleUpvote(selected.id || selected.common_metadata?.report_id)}
                  className="btn btn-sm"
                  style={{
                    gap: 6, flex: 1,
                    background: upvoted[selected.id] ? 'var(--color-danger-light)' : 'var(--color-neutral-100)',
                    color: upvoted[selected.id] ? 'var(--color-danger)' : 'var(--color-neutral-700)',
                    border: '1px solid', borderColor: upvoted[selected.id] ? 'var(--color-danger)' : 'var(--color-neutral-200)',
                  }}>
                  <ThumbsUp size={13} /> {(selected.upvotes || 0) + (upvoted[selected.id] ? 1 : 0)} Report too
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/citizen/tracking/${selected.id || selected.common_metadata?.report_id}`)} style={{ gap: 6 }}>
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
