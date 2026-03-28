import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { mapComplaint, formatDate, DOMAIN_EMOJIS } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { PlusCircle, TrendingUp, MapPin, ChevronRight, ArrowUpCircle, Hand, ClipboardList, CheckCircle2, Settings } from 'lucide-react';

export default function CitizenHome() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    complaintService.listComplaints({ limit: 50 })
      .then(data => setComplaints((data || []).map(mapComplaint)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myComplaints = complaints.filter(c => c.citizen_id === (user?.name || ''));
  // Fall back to all complaints if user filter returns nothing (e.g. for demo)
  const displayComplaints = myComplaints.length > 0 ? myComplaints : complaints;

  const total = displayComplaints.length;
  const resolved = displayComplaints.filter(c => c.status === 'resolved').length;
  const inProgress = displayComplaints.filter(c => c.status === 'in_progress').length;
  const trending = [...complaints].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 60, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
          {greeting}, {user?.name?.split(' ')[0] || 'Citizen'} <Hand size={24} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 8 }} />
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Raised', value: loading ? '...' : total, icon: <ClipboardList size={22} /> },
            { label: 'Resolved', value: loading ? '...' : resolved, icon: <CheckCircle2 size={22} /> },
            { label: 'In Progress', value: loading ? '...' : inProgress, icon: <Settings size={22} /> },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Poppins' }}>{s.value}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <button
        className="btn btn-primary btn-lg"
        onClick={() => navigate('/citizen/submit')}
        style={{ fontSize: 16, gap: 10, padding: '18px 32px', boxShadow: '0 4px 20px rgba(29,78,216,0.35)', transition: 'all 0.2s' }}
      >
        <PlusCircle size={22} />
        Raise a Complaint
      </button>

      {/* Nearby Issues Map */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={20} /> Nearby Issues</h3>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 2 }}>Issues reported in your locality</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/citizen/map')}>
            View Full Map <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ padding: '0 0 16px 0' }}>
          <MapComponent complaints={complaints} height={280} onPinClick={() => {}} />
          <div style={{ display: 'flex', gap: 12, padding: '12px 24px 0', overflowX: 'auto' }}>
            {complaints.slice(0, 4).map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/citizen/tracking/${c.id}`)}
                style={{
                  flexShrink: 0, width: 200, background: 'var(--color-neutral-50)',
                  borderRadius: 10, padding: 12, cursor: 'pointer',
                  border: '1px solid var(--color-neutral-200)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <StatusBadge status={c.status} />
                  <PriorityBadge priority={c.priority} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                <p style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}><MapPin size={10} style={{ marginRight: 2 }} />{c.ward || 'Chennai'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Issues */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} color="var(--color-danger)" /> Trending in Your Area
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/citizen/map')}>See all</button>
        </div>
        <div className="card">
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-neutral-400)' }}>Loading...</div>
          ) : trending.map((c, i) => {
            const emoji = DOMAIN_EMOJIS[c.domain] || '📋';
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/citizen/tracking/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px',
                  borderBottom: i < trending.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-neutral-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--color-neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{c.ward || 'Chennai'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>
                    <ArrowUpCircle size={14} /> {c.upvotes}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
