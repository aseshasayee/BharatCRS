import { useState, useEffect, useRef } from 'react';
import { complaintService } from '../../services/complaintService';
import { statsService } from '../../services/statsService';
import MapComponent from '../../components/MapComponent';
import { Filter, Flame, Trophy, Lightbulb, TrendingUp, AlertTriangle, Zap, RefreshCw, ClipboardList } from 'lucide-react';
import { DOMAIN_ICONS } from '../../utils/helpers';

// Chennai ward metadata in the same structure as the backend
const CHENNAI_WARDS = [
  { ward_id: 1,  name: "Thiruvottiyur",  lat: 13.1572, lon: 80.3194 },
  { ward_id: 2,  name: "Manali",         lat: 13.1657, lon: 80.2636 },
  { ward_id: 3,  name: "Madhavaram",     lat: 13.1483, lon: 80.2316 },
  { ward_id: 4,  name: "Tondiarpet",     lat: 13.1164, lon: 80.2900 },
  { ward_id: 5,  name: "Royapuram",      lat: 13.1093, lon: 80.2967 },
  { ward_id: 6,  name: "Harbour",        lat: 13.0898, lon: 80.2920 },
  { ward_id: 7,  name: "Basin Bridge",   lat: 13.1017, lon: 80.2799 },
  { ward_id: 8,  name: "Park Town",      lat: 13.0797, lon: 80.2755 },
  { ward_id: 9,  name: "Flower Bazaar",  lat: 13.0880, lon: 80.2859 },
  { ward_id: 10, name: "Anna Nagar",     lat: 13.0850, lon: 80.2101 },
  { ward_id: 11, name: "T. Nagar",       lat: 13.0418, lon: 80.2341 },
  { ward_id: 12, name: "Adyar",          lat: 13.0012, lon: 80.2565 },
  { ward_id: 13, name: "Sholinganallur", lat: 12.9010, lon: 80.2279 },
  { ward_id: 14, name: "Alandur",        lat: 13.0005, lon: 80.2074 },
  { ward_id: 15, name: "Ambattur",       lat: 13.1143, lon: 80.1548 },
  { ward_id: 16, name: "Ayanavaram",     lat: 13.1005, lon: 80.2445 },
  { ward_id: 17, name: "Perambur",       lat: 13.1163, lon: 80.2476 },
  { ward_id: 18, name: "Villivakkam",    lat: 13.1017, lon: 80.2095 },
  { ward_id: 19, name: "Kodambakkam",    lat: 13.0523, lon: 80.2225 },
  { ward_id: 20, name: "Valasaravakkam", lat: 13.0490, lon: 80.1758 },
  { ward_id: 21, name: "Manappakkam",    lat: 13.0111, lon: 80.1705 },
];

const STATUS_FILTERS = ['all', 'submitted', 'in_progress', 'resolved'];
const PRIORITY_FILTERS = ['all', 'Critical', 'High', 'Medium', 'Low'];

const PRIORITY_GLOW = {
  Critical: { color: '#EF4444', glow: '0 0 24px rgba(239,68,68,0.8), 0 0 48px rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.12)' },
  High:     { color: '#F97316', glow: '0 0 20px rgba(249,115,22,0.7), 0 0 40px rgba(249,115,22,0.35)', bg: 'rgba(249,115,22,0.10)' },
  Medium:   { color: '#FBBF24', glow: '0 0 16px rgba(251,191,36,0.6), 0 0 32px rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
  Low:      { color: '#34D399', glow: '0 0 12px rgba(52,211,153,0.5), 0 0 24px rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.06)' },
};

function HeatIntensityBar({ pct, priority }) {
  const style = PRIORITY_GLOW[priority] || PRIORITY_GLOW.Medium;
  return (
    <div style={{ height: 10, background: 'var(--color-neutral-100)', borderRadius: 10, overflow: 'hidden', position: 'relative', border: '1px solid rgba(0,0,0,0.03)' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${style.color}99, ${style.color})`,
        borderRadius: 10,
        transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: style.glow,
        position: 'relative',
      }}>
        {/* Shimmer effect */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'heatShimmer 2s infinite',
        }} />
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'white',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      borderRadius: 20, padding: '16px 20px', flex: 1,
      transition: 'all 0.3s ease',
      cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        color, flexShrink: 0, width: 40, height: 40,
        background: `${color}15`, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--color-neutral-900)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-neutral-500)', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

export default function CitizenHeatmap() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [hoveredWard, setHoveredWard] = useState(null);
  const refreshTimerRef = useRef(null);

  const fetchData = async () => {
    try {
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority_class = priorityFilter;
      filters.limit = 200;
      const data = await complaintService.listComplaints(filters);
      setComplaints(data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Heatmap fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    refreshTimerRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(refreshTimerRef.current);
  }, [statusFilter, priorityFilter]);

  // Ward analytics derived from complaints
  const wardStats = CHENNAI_WARDS.map(ward => {
    const wardComplaints = complaints.filter(c => {
      const dbWardId = c.spatio_temporal_core?.administrative_unit?.ward_id;
      return dbWardId === ward.ward_id;
    });
    const critical = wardComplaints.filter(c => c.priority_assessment?.priority_class === 'Critical').length;
    const high = wardComplaints.filter(c => c.priority_assessment?.priority_class === 'High').length;
    const resolved = wardComplaints.filter(c => c.common_metadata?.status === 'resolved').length;
    const unresolved = wardComplaints.length - resolved;
    return { ...ward, count: wardComplaints.length, critical, high, resolved, unresolved };
  }).sort((a, b) => b.count - a.count);

  const topHotspots = wardStats.slice(0, 5).filter(w => w.count > 0);
  const maxCount = topHotspots.length > 0 ? topHotspots[0].count : 1;

  // Stats
  const totalComplaints = complaints.length;
  const criticalCount = complaints.filter(c => c.priority_assessment?.priority_class === 'Critical').length;
  const resolvedCount = complaints.filter(c => c.common_metadata?.status === 'resolved').length;
  const unresolvedCount = totalComplaints - resolvedCount;

  // For filter
  const filteredWards = wardFilter === 'all' ? wardStats : wardStats.filter(w => w.name === wardFilter);

  // Domain stats
  const domainCounts = {};
  complaints.forEach(c => {
    const d = c.domain_classification?.primary_domain;
    if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
  });
  const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // Removed DOMAIN_EMOJIS definition

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--color-neutral-50)' }}>
      <style>{`
        @keyframes heatShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heatPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.8; }
        }
        .ward-hotspot-row:hover { background: var(--color-neutral-50) !important; transform: translateX(3px); }
        .ward-hotspot-row { transition: all 0.18s ease; cursor: pointer; border-left: 2px solid transparent; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 800, color: 'var(--color-neutral-900)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={24} color="#EF4444" />
            </div>
            Issue Heatmap
          </h2>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: 14, marginTop: 8, fontWeight: 500 }}>
            Live complaint density across Chennai — updated every 30 seconds
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'white', border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            borderRadius: 14, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: 'var(--color-neutral-600)', transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Refreshing...' : `Last: ${lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
        </button>
      </div>

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: 12 }}>
        <StatPill icon={<Flame size={20} />} label="Total Active" value={loading ? '...' : totalComplaints} color="#EF4444" />
        <StatPill icon={<AlertTriangle size={20} />} label="Critical Issues" value={loading ? '...' : criticalCount} color="#F97316" />
        <StatPill icon={<Zap size={20} />} label="Unresolved" value={loading ? '...' : unresolvedCount} color="#FBBF24" />
        <StatPill icon={<TrendingUp size={20} />} label="Resolved" value={loading ? '...' : resolvedCount} color="#34D399" />
      </div>

      {/* Filters */}
      <div className="card" style={{
        background: 'white', borderRadius: 20, padding: '16px 20px',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16, borderRight: '1px solid var(--color-neutral-200)' }}>
          <Filter size={18} color="var(--color-neutral-500)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-600)' }}>Filter by</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: statusFilter === s ? '#1557C0' : 'var(--color-neutral-200)',
              background: statusFilter === s ? '#1557C0' : 'white',
              color: statusFilter === s ? 'white' : 'var(--color-neutral-600)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
              textTransform: 'capitalize',
            }}>
              {s === 'all' ? 'All Status' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--color-neutral-200)' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRIORITY_FILTERS.map(p => {
            const style = PRIORITY_GLOW[p];
            return (
              <button key={p} onClick={() => setPriorityFilter(p)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: priorityFilter === p ? (style?.color || '#1557C0') : 'var(--color-neutral-200)',
                background: priorityFilter === p ? (style?.color || '#1557C0') : 'white',
                color: priorityFilter === p ? 'white' : 'var(--color-neutral-600)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: priorityFilter === p && style ? style.glow.split(',')[0] : 'none',
              }}>
                {p === 'all' ? 'All Priority' : p}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <select
            value={wardFilter} onChange={e => setWardFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--color-neutral-200)', fontSize: 13, outline: 'none', background: 'white' }}
          >
            <option value="all">All Wards</option>
            {CHENNAI_WARDS.map(w => <option key={w.ward_id} value={w.name}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, alignItems: 'stretch' }}>
        {/* Map with glow overlay */}
          <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 600 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-neutral-900)' }}>
                <Flame size={18} color="#EF4444" /> Complaint Density — Chennai
              </h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', fontWeight: 600 }}>Critical</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 6px #F97316', marginLeft: 10 }} />
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', fontWeight: 600 }}>High</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', marginLeft: 10 }} />
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', fontWeight: 600 }}>Low</span>
              </div>
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <MapComponent complaints={complaints} height="100%" mode="heatmap" />
              </div>

              {/* Density legend */}
              <div style={{
                position: 'absolute', bottom: 16, left: 16, zIndex: 50,
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
                borderRadius: 16, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}>
                <p style={{ fontSize: 10, fontWeight: 800, marginBottom: 8, color: 'var(--color-neutral-600)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>COMPLAINT DENSITY</p>
                <div style={{ position: 'relative', height: 8, width: 220, borderRadius: 6, background: 'linear-gradient(to right, #4ade80, #facc15, #f97316, #ef4444)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-neutral-500)', fontWeight: 600 }}>Low</span>
                  <span style={{ fontSize: 10, color: 'var(--color-neutral-500)', fontWeight: 600 }}>Med</span>
                  <span style={{ fontSize: 10, color: 'var(--color-neutral-500)', fontWeight: 600 }}>High</span>
                  </div>
                </div>
              </div>
            </div>

        {/* Right Panel: Hotspots + Domain Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Hotspot Wards */}
            <div style={{ overflow: 'hidden', background: 'white', borderRadius: 24, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-neutral-100)' }}>
                <Trophy size={20} color="var(--color-primary)" />
                <span style={{ fontWeight: 800, fontSize: 16 }}>Top Hotspot Wards</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-neutral-500)', fontWeight: 500 }}>Live from DB</span>
              </div>
              <div style={{ padding: '12px 0' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>Loading ward data...</div>
              ) : topHotspots.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 13 }}>No data — seed the database first</div>
              ) : (
                topHotspots.map((ward, i) => {
                  const pct = Math.round((ward.count / maxCount) * 100);
                  const priority = ward.critical > 0 ? 'Critical' : ward.high > 0 ? 'High' : 'Medium';
                  const style = PRIORITY_GLOW[priority];
                  const rankColors = ['#FBBF24', '#9CA3AF', '#CD7C54', '#6B7280', '#6B7280'];
                  return (
                    <div key={ward.ward_id} className="ward-hotspot-row" style={{ padding: '12px 20px', borderRadius: 8, marginBottom: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: `${rankColors[i]}22`, border: `1px solid ${rankColors[i]}55`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: rankColors[i],
                          }}>#{i + 1}</div>
                          <span style={{ color: 'var(--color-neutral-900)', fontWeight: 600, fontSize: 13 }}>{ward.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {ward.critical > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                              {ward.critical} <AlertTriangle size={10} />
                            </span>
                          )}
                          <span style={{ fontWeight: 800, color: style.color, fontSize: 14 }}>{ward.count}</span>
                        </div>
                      </div>
                      <HeatIntensityBar pct={pct} priority={priority} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 10, color: '#6B7280' }}>{ward.unresolved} unresolved</span>
                        <span style={{ fontSize: 10, color: '#34D399' }}>{ward.resolved} resolved</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ overflow: 'hidden', background: 'white', borderRadius: 24, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--color-neutral-100)' }}>
              <TrendingUp size={20} color="var(--color-primary)" />
              <span style={{ fontWeight: 800, fontSize: 16 }}>Issue Category Breakdown</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {loading ? (
                <p style={{ fontSize: 13, color: 'var(--color-neutral-400)', textAlign: 'center', padding: 16 }}>Loading...</p>
              ) : topDomains.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-neutral-400)', padding: 16 }}>No data yet</p>
              ) : topDomains.map(([domain, count]) => {
                const pct = Math.round((count / totalComplaints) * 100);
                const IconComponent = DOMAIN_ICONS[domain] || ClipboardList;
                return (
                  <div key={domain}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconComponent size={14} color="var(--color-primary)" /> {domain.split('&')[0].trim()}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-900)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--color-neutral-100)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--color-primary), #3B82F6)',
                        borderRadius: 6, transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight callout */}
          {!loading && criticalCount > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(249,115,22,0.05))',
              border: '1px solid rgba(239,68,68,0.15)',
              boxShadow: '0 4px 12px rgba(239,68,68,0.05)',
              borderRadius: 24, padding: '20px',
              display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lightbulb size={20} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 14, color: '#EF4444', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Active Alerts</p>
                <p style={{ fontSize: 13, color: 'var(--color-neutral-700)', lineHeight: 1.6, fontWeight: 500 }}>
                  <strong style={{ color: '#dc2626' }}>{criticalCount} critical</strong> {criticalCount === 1 ? 'issue requires' : 'issues require'} immediate attention. Top hotspot: <strong style={{ color: 'var(--color-neutral-900)' }}>{topHotspots[0]?.name || 'N/A'}</strong> with <strong style={{ color: 'var(--color-neutral-900)' }}>{topHotspots[0]?.count || 0}</strong> complaints.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
