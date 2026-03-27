import { useState, useEffect } from 'react';
import { COMPLAINTS, timeAgo } from '../../data/mockData';
import { PriorityBadge, CategoryChip } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { Pause, Play, Filter, Volume2, VolumeX, Circle, MapPin, User, Clock } from 'lucide-react';

const LIVE_STREAM = [
  { id: 'BHR-2024-NEW-1', title: 'Broken water pipe flooding street', category: 'water', priority: 'high', ward: 'Ward 3 - Whitefield', time: new Date(), citizenName: 'Anitha Rao' },
  { id: 'BHR-2024-NEW-2', title: 'Power outage residential area', category: 'electricity', priority: 'medium', ward: 'Ward 2 - Indiranagar', time: new Date(Date.now() - 180000), citizenName: 'Ramesh S.' },
  { id: 'BHR-2024-NEW-3', title: 'Road cave-in near school', category: 'road', priority: 'high', ward: 'Ward 7 - Marathahalli', time: new Date(Date.now() - 3600000), citizenName: 'Priya Sharma' },
  { id: 'BHR-2024-NEW-4', title: 'Garbage overflow on main road', category: 'sanitation', priority: 'medium', ward: 'Ward 5 - Rajajinagar', time: new Date(Date.now() - 7200000), citizenName: 'Vikram B.' },
];

export default function DeptLive() {
  const { addToast } = useApp();
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [filterHigh, setFilterHigh] = useState(false);
  const [timeWindow, setTimeWindow] = useState('live');
  const [issues, setIssues] = useState(LIVE_STREAM);
  const [newCount, setNewCount] = useState(0);

  // Simulate new incoming issues
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const fake = {
        id: `BHR-2024-AUTO-${Math.floor(Math.random() * 9000)}`,
        title: ['Pothole blocking traffic', 'No electricity for 2 hours', 'Water leakage', 'Garbage not collected'][Math.floor(Math.random() * 4)],
        category: ['road', 'electricity', 'water', 'sanitation'][Math.floor(Math.random() * 4)],
        priority: Math.random() > 0.6 ? 'high' : 'medium',
        ward: `Ward ${Math.floor(Math.random() * 12) + 1}`,
        time: new Date(),
        citizenName: 'Citizen',
      };
      setIssues(prev => [fake, ...prev].slice(0, 20));
      setNewCount(n => n + 1);
      if (fake.priority === 'high') addToast(`🚨 High priority issue in ${fake.ward}`, 'error');
    }, 12000);
    return () => clearInterval(timer);
  }, [paused]);

  const displayed = (filterHigh ? issues.filter(i => i.priority === 'high') : issues);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Live Updates</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: paused ? 'var(--color-neutral-400)' : 'var(--color-success)', animation: paused ? 'none' : 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{paused ? 'Paused' : 'Live — Auto-refreshing'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['live', '1hr', '4hr'].map(t => (
            <button key={t} onClick={() => setTimeWindow(t)} className="btn btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: timeWindow === t ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: timeWindow === t ? 'white' : 'var(--color-neutral-700)', padding: '5px 12px' }}>
              {t === 'live' ? <><Circle fill="currentColor" size={10} /> Live</> : `Last ${t}`}
            </button>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => setFilterHigh(!filterHigh)} style={{ gap: 6, background: filterHigh ? 'var(--color-danger-light)' : undefined, color: filterHigh ? 'var(--color-danger)' : undefined }}>
            <Filter size={13} /> {filterHigh ? 'High Only' : 'All Priority'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSound(!sound)} style={{ gap: 6 }}>
            {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPaused(!paused)} style={{ gap: 6 }}>
            {paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-danger-light)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
          <Circle fill="currentColor" size={10} style={{ marginRight: 6 }} /> {displayed.filter(i => i.priority === 'high').length} High Priority
        </div>
        <div style={{ background: 'var(--color-primary-light)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
          {displayed.length} Total Incoming
        </div>
        {newCount > 0 && (
          <div style={{ background: 'var(--color-success-light)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
            +{newCount} new this session
          </div>
        )}
      </div>

      {/* Live feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayed.map((issue, i) => (
          <div key={issue.id}
            className="card"
            style={{
              borderLeft: issue.priority === 'high' ? '4px solid var(--color-danger)' : '4px solid var(--color-warning)',
              animation: i === 0 ? 'slideDown 0.3s ease' : 'none',
            }}>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <PriorityBadge priority={issue.priority} />
                  <CategoryChip category={issue.category} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-neutral-600)' }}>{issue.id}</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{issue.title}</p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {issue.ward}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {issue.citizenName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {timeAgo(issue.time.toISOString())}</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => addToast(`${issue.id} accepted — In Progress`, 'success')}
                style={{ flexShrink: 0 }}>
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideDown { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
