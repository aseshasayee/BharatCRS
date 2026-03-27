import { useState } from 'react';
import { COMPLAINTS, CATEGORIES, WARDS } from '../../data/mockData';
import MapComponent from '../../components/MapComponent';
import { Filter, Flame, Trophy, Lightbulb } from 'lucide-react';

const HOTSPOTS = [
  { area: 'Ward 1 - Koramangala', count: 47, pct: 85 },
  { area: 'Ward 4 - Jayanagar', count: 38, pct: 69 },
  { area: 'Ward 7 - Marathahalli', count: 31, pct: 56 },
];

export default function CitizenHeatmap() {
  const [category, setCategory] = useState([]);
  const [ward, setWard] = useState('');
  const [timeRange, setTimeRange] = useState('week');

  const toggleCat = (id) => setCategory(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Issue Heatmap</h2>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Visualize complaint density across your city.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Filter panel */}
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} /> Filters
            </h3>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Time Range</label>
              {['Today', 'This Week', 'This Month', 'Last 3 Months'].map((t, i) => {
                const val = ['today','week','month','quarter'][i];
                return (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                    <input type="radio" name="timeRange" checked={timeRange === val} onChange={() => setTimeRange(val)} />
                    <span style={{ fontSize: 13 }}>{t}</span>
                  </label>
                );
              })}
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              {CATEGORIES.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
                  <input type="checkbox" checked={category.includes(c.id)} onChange={() => toggleCat(c.id)} />
                  <span style={{ fontSize: 13 }}>{c.label}</span>
                </label>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Ward / Area</label>
              <select className="form-select" value={ward} onChange={e => setWard(e.target.value)}>
                <option value="">All Wards</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-full">Apply Filters</button>
          </div>
        </div>

        {/* Map + insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Flame size={20} color="var(--color-danger)" /> Complaint Density Map</h3>
              <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Last 7 days</span>
            </div>
            <div style={{ position: 'relative' }}>
              <MapComponent complaints={COMPLAINTS} height={460} />
              {/* Heatmap overlay simulation */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 30% 40%, rgba(220,38,38,0.15) 0%, rgba(217,119,6,0.08) 40%, transparent 70%), radial-gradient(ellipse at 70% 60%, rgba(220,38,38,0.12) 0%, transparent 50%)',
                borderRadius: 'inherit',
              }} />
              {/* Legend */}
              <div style={{
                position: 'absolute', bottom: 16, left: 16,
                background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '8px 12px',
                backdropFilter: 'blur(4px)', border: '1px solid var(--color-neutral-200)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--color-neutral-700)' }}>DENSITY</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ height: 8, width: 100, borderRadius: 4, background: 'linear-gradient(to right, #3b82f6, #22c55e, #f59e0b, #dc2626)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-neutral-600)' }}>Low</span>
                  <span style={{ fontSize: 10, color: 'var(--color-neutral-600)' }}>High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hotspot areas */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={20} color="var(--color-warning)" /> Top Hotspot Areas</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {HOTSPOTS.map((h, i) => (
                <div key={h.area}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>#{i + 1} {h.area}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: 14 }}>{h.count} complaints</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--color-neutral-100)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${h.pct}%`, background: 'linear-gradient(90deg, var(--color-warning), var(--color-danger))', borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--color-warning-light)', borderRadius: 10, fontSize: 13, color: 'var(--color-warning)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Road damage complaints increased 40% this week in Ward 1 - Koramangala</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
