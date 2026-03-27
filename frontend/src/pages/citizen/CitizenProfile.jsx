import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { COMPLAINTS, CITIZEN_STATS, formatDate } from '../../data/mockData';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { Edit2, ChevronRight, ClipboardList, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

export default function CitizenProfile() {
  const { user } = useApp();
  const navigate = useNavigate();
  const myComplaints = COMPLAINTS.filter(c => c.citizenId === 'citizen-1');
  const resolved = myComplaints.filter(c => c.status === 'resolved').length;
  const total = myComplaints.length;

  const stats = [
    { label: 'Total Raised', value: total, icon: <ClipboardList size={28} color="var(--color-primary)" /> },
    { label: 'Resolved', value: resolved, icon: <CheckCircle2 size={28} color="var(--color-success)" /> },
    { label: 'Resolution Rate', value: `${Math.round((resolved / total) * 100)}%`, icon: <TrendingUp size={28} color="var(--color-warning)" /> },
    { label: 'Avg Resolution', value: '4.2 days', icon: <Clock size={28} color="var(--color-primary)" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Profile header card */}
      <div className="card">
        <div style={{ background: 'var(--color-primary)', height: 100, borderRadius: '12px 12px 0 0' }} />
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', marginTop: -40,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 28, fontWeight: 700, fontFamily: 'Poppins',
            border: '4px solid white', boxShadow: 'var(--shadow-md)',
          }}>
            {user?.initials || 'PS'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins', fontSize: 22, fontWeight: 700 }}>{user?.name}</h2>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 2 }}>{user?.phone}</p>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: 13, marginTop: 4 }}>Member since {user?.memberSince}</p>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <Edit2 size={13} /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4">
        {stats.map(s => (
          <div key={s.label} className="metric-card">
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div className="metric-value" style={{ fontSize: 24 }}>{s.value}</div>
            <div className="metric-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Complaint history */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ClipboardList size={20} /> Complaint History</h3>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{total} total</span>
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Category</th><th>Submitted</th><th>Status</th><th>Priority</th><th></th>
              </tr>
            </thead>
            <tbody>
              {myComplaints.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/citizen/tracking/${c.id}`)}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.id}</span></td>
                  <td style={{ maxWidth: 220 }}><span style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span></td>
                  <td>{c.category}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{formatDate(c.submittedAt)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td><ChevronRight size={16} color="var(--color-neutral-400)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
