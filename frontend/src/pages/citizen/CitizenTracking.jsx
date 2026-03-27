import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPLAINTS, formatDate, timeAgo } from '../../data/mockData';
import { StatusBadge, PriorityBadge, CategoryChip, EmptyState } from '../../components/SharedComponents';
import { Search, ChevronRight, MapPin, Calendar } from 'lucide-react';

export default function CitizenTracking() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const myComplaints = COMPLAINTS.filter(c => c.citizenId === 'citizen-1');
  const filtered = myComplaints.filter(c =>
    (!statusFilter || c.status === statusFilter) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>My Complaints</h2>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Track the status of all your submitted complaints.</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by ID or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['submitted','verified','assigned','inprogress','resolved','escalated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No complaints found" desc="Try adjusting your filters or raise your first complaint." cta="Raise Complaint" onCta={() => navigate('/citizen/submit')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/citizen/tracking/${c.id}`)}
              className="card"
              style={{
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: c.priority === 'high' ? '4px solid var(--color-danger)' : c.priority === 'medium' ? '4px solid var(--color-warning)' : '4px solid var(--color-neutral-300)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-low)'}
            >
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-600)', fontFamily: 'monospace' }}>{c.id}</span>
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}><CategoryChip category={c.category} /></span>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {c.ward}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDate(c.submittedAt)}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>Updated {timeAgo(c.updatedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--color-neutral-400)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
