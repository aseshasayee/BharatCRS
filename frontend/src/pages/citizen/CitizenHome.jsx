import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { mapComplaint, formatDate, DOMAIN_ICONS } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { PlusCircle, TrendingUp, MapPin, ChevronRight, ArrowUpCircle, Hand, ClipboardList, CheckCircle, Settings, AlertTriangle, Clock } from 'lucide-react';

export default function CitizenHome() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [nearbyComplaints, setNearbyComplaints] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_complaints: 0, resolved: 0, assigned: 0, in_progress: 0 });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const userId = user?.name || '';
    
    // Fetch all complains for the map and trending
    complaintService.listComplaints({ limit: 50 })
      .then(data => setNearbyComplaints((data || []).map(mapComplaint)))
      .catch(console.error);

    // Fetch user-specific complaints
    complaintService.listComplaints({ limit: 10, user_id: userId })
      .then(data => setMyComplaints((data || []).map(mapComplaint)))
      .catch(console.error);
      
    // Fetch user-specific stats
    complaintService.getStats({ user_id: userId })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.name]);

  const total = stats?.total_complaints || 0;
  const resolved = stats?.resolved || 0;
  const inProgress = (stats?.assigned || 0) + (stats?.in_progress || 0) + (stats?.in_process || 0);
  const trending = [...nearbyComplaints].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);

  const displayUserName = user?.name?.length >= 10 && !isNaN(user?.name) 
    ? `+91 ${user.name.substring(0,5)} ${user.name.substring(5)}` 
    : user?.name?.split(' ')[0] || 'Citizen';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease-in-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .stat-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.2) !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .gradient-text { background: linear-gradient(to right, #ffffff, #e0e7ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .issue-card:hover .issue-title { color: var(--color-primary); }
      `}</style>
      
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: 'var(--radius-xl)', padding: '40px 48px',
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 250, height: 250, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))', backdropFilter: 'blur(10px)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 120, width: 180, height: 180, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))', backdropFilter: 'blur(5px)' }} />
        
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="gradient-text" style={{ fontFamily: 'Poppins', fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {greeting}, {displayUserName} <Hand size={32} style={{ display: 'inline', verticalAlign: 'baseline', marginLeft: 12, animation: 'wave 2.5s infinite transform-origin: 70% 70%' }} />
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { label: 'Total Raised', value: loading ? '...' : (stats?.total_complaints || 0), icon: <ClipboardList size={28} /> },
              { label: 'Resolved Issues', value: loading ? '...' : (stats?.resolved || 0), icon: <CheckCircle size={28} /> },
              { label: 'In Progress', value: loading ? '...' : inProgress, icon: <Settings size={28} /> },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ 
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 16, padding: '24px', backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10 }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'Poppins', lineHeight: 1 }}>{s.value}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, opacity: 0.9 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <button
              className="btn"
              onClick={() => navigate('/citizen/submit')}
              style={{ 
                background: 'white', color: '#1e3a8a', 
                fontSize: 16, fontWeight: 700, gap: 10, padding: '16px 32px', 
                borderRadius: '99px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease', transform: 'translateY(0)',
                display: 'inline-flex', alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <PlusCircle size={22} color="#3b82f6" />
              Raise a Complaint
            </button>
          </div>
        </div>
      </div>

      {/* Nearby Issues Map */}
      <div className="card" style={{ overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-xl)' }}>
        <div className="card-header" style={{ padding: '24px', background: 'white', borderBottom: '1px solid var(--color-neutral-100)' }}>
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 700 }}><MapPin size={24} color="var(--color-primary)" /> Nearby Issues</h3>
            <p style={{ fontSize: 14, color: 'var(--color-neutral-600)', marginTop: 4 }}>Issues reported in your locality</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/citizen/heatmap')} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            View Full Heatmap <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <MapComponent complaints={nearbyComplaints} height={340} onPinClick={() => {}} />
          <div style={{ 
            position: 'absolute', bottom: 16, left: 0, right: 0,
            display: 'flex', gap: 16, padding: '0 24px', overflowX: 'auto',
            scrollbarWidth: 'none' /* Firefox */
          }}>
            {nearbyComplaints.slice(0, 5).map(c => (
              <div
                key={c.id}
                className="issue-card"
                onClick={() => navigate(`/citizen/tracking/${c.id}`)}
                style={{
                  flexShrink: 0, width: 260, background: 'rgba(255,255,255,0.95)',
                  borderRadius: 16, padding: 16, cursor: 'pointer',
                  border: '1px solid var(--color-neutral-200)', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <StatusBadge status={c.status} />
                  <PriorityBadge priority={c.priority} />
                </div>
                <p className="issue-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>{c.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--color-neutral-600)', fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{c.ward || 'Chennai'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{formatDate(c.timestamp).split(',')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Issues */}
      <div className="section">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700 }}>
            <TrendingUp size={24} color="var(--color-danger)" /> Trending in Your Area
          </h3>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-xl)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-neutral-400)', fontWeight: 500 }}>Loading local data...</div>
          ) : trending.map((c, i) => {
            const IconComponent = DOMAIN_ICONS[c.domain] || ClipboardList;
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/citizen/tracking/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '20px 24px',
                  borderBottom: i < trending.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: 'white'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-light)'; e.currentTarget.style.paddingLeft = '30px'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.paddingLeft = '24px'; }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'var(--color-neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-primary)', flexShrink: 0,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <IconComponent size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{c.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-neutral-500)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12}/> {c.ward || 'Chennai'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontSize: 14, fontWeight: 700, background: 'var(--color-danger-light)', padding: '6px 12px', borderRadius: 20 }}>
                    <ArrowUpCircle size={16} /> {c.upvotes}
                  </div>
                  <div style={{ transform: 'scale(1.05)' }}><StatusBadge status={c.status} /></div>
                  <ChevronRight size={20} color="var(--color-neutral-300)" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
