import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { complaintService } from '../../services/complaintService';
import { mapComplaint } from '../../utils/helpers';
import MapComponent from '../../components/MapComponent';
import { Brain, Map, Flame, TrendingUp, Lightbulb } from 'lucide-react';

const FORECAST = [
  { day: 'Day 1', predicted: 8 }, { day: 'Day 3', predicted: 12 },
  { day: 'Day 7', predicted: 18 }, { day: 'Day 14', predicted: 15 }, { day: 'Day 30', predicted: 24 },
];

const DEPT_PREDICTIONS = [
  { rank: 1, ward: 'Ward 7 - Marathahalli', volume: 18, category: 'Road Damage', confidence: 84 },
  { rank: 2, ward: 'Ward 5 - Rajajinagar', volume: 12, category: 'Road Damage', confidence: 76 },
  { rank: 3, ward: 'Ward 3 - Whitefield', volume: 9, category: 'Road Damage', confidence: 68 },
];

export default function DeptPredictions() {
  const [days, setDays] = useState(7);
  const [complaints, setComplaints] = useState([]);
  const [deptPredictions, setDeptPredictions] = useState([]);

  useEffect(() => {
    complaintService.listComplaints({ limit: 200 }).then(data => {
      const mapped = (data||[]).map(mapComplaint);
      setComplaints(mapped);
      const wardCounts = {};
      mapped.forEach(c => { if (c.ward) wardCounts[c.ward] = (wardCounts[c.ward]||0)+1; });
      setDeptPredictions(Object.entries(wardCounts).sort((a,b)=>b[1]-a[1]).slice(0,3)
        .map(([ward,count],i) => ({ rank:i+1, ward, category:'Infrastructure', volume:count, confidence: Math.min(95, 60+count*3) })));
    }).catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Hotspot Prediction</h2>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>
            Predicted surges in road-related complaints — Public Works Dept.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-primary-light)', padding: '8px 14px', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
          <Brain size={16} /> AI Model · Road Category
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Map */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Map size={20} /> Predicted Hotspot Zones</h3>
          </div>
          <div style={{ position: 'relative' }}>
            <MapComponent complaints={complaints} height={380} />
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 40% 55%, rgba(220,38,38,0.18) 0%, rgba(217,119,6,0.1) 35%, transparent 60%)',
              borderRadius: 'inherit',
            }} />
          </div>
          {/* Time slider */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label">Forecast Window</label>
              <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>{days} days</span>
            </div>
            <input type="range" min={7} max={30} step={7} value={days} onChange={e => setDays(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 4 }}>
              <span>7d</span><span>14d</span><span>30d</span>
            </div>
          </div>
        </div>

        {/* Prediction panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Flame size={20} color="var(--color-danger)" /> Predicted Surge Areas</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {deptPredictions.map((p, i) => (
                <div key={p.rank} style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: i < deptPredictions.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
                  }}>
                    {p.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ward}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 2 }}>{p.category} · ~{p.volume} issues</p>
                  </div>
                  <span style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0, alignSelf: 'center' }}>
                    {p.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><TrendingUp size={20} /> Issue Forecast</h3></div>
            <div style={{ padding: '8px 16px 16px' }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={FORECAST.slice(0, days === 7 ? 3 : days === 14 ? 4 : 5)}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="predicted" stroke="var(--color-danger)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'var(--color-warning-light)', borderRadius: 12, padding: '16px', border: '1px solid rgba(217,119,6,0.2)' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-warning)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={16} /> Resource Pre-allocation Recommendation</p>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
              Based on predictions, consider deploying <strong>2 additional repair crews</strong> to Ward 7 — Marathahalli starting next Monday to handle the expected surge in road damage complaints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
