import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { mapComplaint, formatDate } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { Edit2, ChevronRight, ClipboardList, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

export default function CitizenProfile() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    complaintService.listComplaints({ limit: 200 })
      .then(data => setComplaints((data || []).map(mapComplaint)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myComplaints = complaints.filter(c => c.citizen_id === user?.name);
  const displayComplaints = myComplaints.length > 0 ? myComplaints : complaints;
  const resolved = displayComplaints.filter(c => c.status === 'resolved').length;
  const total = displayComplaints.length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const stats = [
    { label: 'Total Raised', value: loading ? '...' : total, icon: <ClipboardList size={28} color="var(--color-primary)" /> },
    { label: 'Resolved', value: loading ? '...' : resolved, icon: <CheckCircle2 size={28} color="var(--color-success)" /> },
    { label: 'Resolution Rate', value: loading ? '...' : `${rate}%`, icon: <TrendingUp size={28} color="var(--color-warning)" /> },
    { label: 'Active Issues', value: loading ? '...' : total - resolved, icon: <Clock size={28} color="var(--color-primary)" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
      {/* Profile header card */}
      <div className="card">
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', height: 100, borderRadius: '12px 12px 0 0' }} />
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', marginTop: -40,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 28, fontWeight: 700, fontFamily: 'Poppins',
            border: '4px solid white', boxShadow: 'var(--shadow-md)',
          }}>
            {user?.initials || (user?.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins', fontSize: 22, fontWeight: 700 }}>{user?.name || 'Citizen'}</h2>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: 13, marginTop: 4 }}>Aadhaar Verified Citizen</p>
              <p style={{ color: 'var(--color-neutral-400)', fontSize: 12, marginTop: 2 }}>BharatCRS Member</p>
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
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{loading ? '...' : total} total</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-neutral-400)' }}>Loading complaints...</div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Description</th><th>Domain</th><th>Submitted</th><th>Status</th><th>Priority</th><th></th>
                </tr>
              </thead>
              <tbody>
                {displayComplaints.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/citizen/tracking/${c.id}`)}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.id}</span></td>
                    <td style={{ maxWidth: 220 }}><span style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span></td>
                    <td><span style={{ fontSize: 12 }}>{c.domain?.split('&')[0]?.trim() || 'N/A'}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{formatDate(c.submittedAt)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td><ChevronRight size={16} color="var(--color-neutral-400)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
