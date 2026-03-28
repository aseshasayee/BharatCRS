import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { complaintService } from '../../services/complaintService';
import { mapComplaint } from '../../utils/helpers';
import MapComponent from '../../components/MapComponent';
import { CheckCircle, X, Brain, Clock, Calendar, Map, Flame, TrendingUp, Lightbulb } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const FORECAST = [
  { day: 'Day 1', predicted: 62 }, { day: 'Day 3', predicted: 78 },
  { day: 'Day 7', predicted: 94 }, { day: 'Day 10', predicted: 87 },
  { day: 'Day 14', predicted: 112 }, { day: 'Day 21', predicted: 98 },
  { day: 'Day 30', predicted: 130 },
];

const SUGGESTIONS = [
  { id: 1, text: 'Deploy 2 additional road repair teams to Ward 7 next week', accepted: null },
  { id: 2, text: 'Pre-position water board crew in Ward 12 for pipeline check', accepted: null },
  { id: 3, text: 'Increase BESCOM patrol in Ward 3 — transformer checks', accepted: null },
];

export default function AdminPredictions() {
  const { addToast } = useApp();
  const [days, setDays] = useState(7);
  const [suggestions, setSuggestions] = useState(SUGGESTIONS);
  const [toggle, setToggle] = useState('predicted');
  const [complaints, setComplaints] = useState([]);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    complaintService.listComplaints({ limit: 200 }).then(data => {
      const mapped = (data||[]).map(mapComplaint);
      setComplaints(mapped);
      // Derive hotspot predictions from ward complaint counts
      const wardCounts = {};
      mapped.forEach(c => { if (c.ward) wardCounts[c.ward] = (wardCounts[c.ward]||0)+1; });
      const hotspots = Object.entries(wardCounts)
        .sort((a,b)=>b[1]-a[1]).slice(0,5)
        .map(([ward, count], i) => ({ rank: i+1, ward, category: 'Infrastructure', volume: count, confidence: Math.min(95, 60+count*3) }));
      setPredictions(hotspots);
    }).catch(console.error);
  }, []);

  const handleSuggestion = (id, val) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, accepted: val } : s));
    addToast(val ? 'Suggestion accepted ✓' : 'Suggestion dismissed', val ? 'success' : 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Prediction & Modeling</h2>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>AI-powered hotspot forecast and resource planning</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-primary-light)', padding: '8px 14px', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
          <Brain size={16} /> AI Model v2.1 · Retrained 3 days ago
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Map */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Map size={20} /> Predicted Hotspots</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['current','predicted'].map(m => (
                <button key={m} onClick={() => setToggle(m)}
                  className="btn btn-sm"
                  style={{ background: toggle === m ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: toggle === m ? 'white' : 'var(--color-neutral-700)', padding: '4px 12px', textTransform: 'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <MapComponent complaints={complaints} height={400} />
            {/* Prediction overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse at 45% 50%, rgba(220,38,38,${toggle === 'predicted' ? '0.2' : '0.1'}) 0%, rgba(217,119,6,0.1) 35%, transparent 60%), 
                           radial-gradient(ellipse at 70% 35%, rgba(217,119,6,${toggle === 'predicted' ? '0.18' : '0.08'}) 0%, transparent 45%)`,
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
              <span>7 days</span><span>14 days</span><span>30 days</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top hotspots */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Flame size={20} color="var(--color-danger)" /> Top Predicted Hotspots</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {predictions.map((p, i) => (
                <div key={p.rank} style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: i < predictions.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: i < 2 ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
                    color: i < 2 ? 'var(--color-danger)' : 'var(--color-warning)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {p.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ward}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 2 }}>{p.category} · ~{p.volume} issues</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {p.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forecast chart */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><TrendingUp size={20} /> Volume Forecast</h3></div>
            <div style={{ padding: '8px 16px 16px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={FORECAST.slice(0, days === 7 ? 3 : days === 14 ? 5 : 7)}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="predicted" stroke="var(--color-danger)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resource suggestions */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Lightbulb size={20} color="var(--color-warning)" /> Suggested Actions</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {suggestions.map((s, i) => (
                <div key={s.id} style={{
                  padding: '12px 16px', borderBottom: i < suggestions.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
                  background: s.accepted === true ? 'var(--color-success-light)' : s.accepted === false ? 'var(--color-neutral-50)' : 'white',
                  opacity: s.accepted === false ? 0.6 : 1,
                }}>
                  <p style={{ fontSize: 13, marginBottom: 8 }}>{s.text}</p>
                  {s.accepted === null ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm" style={{ gap: 4, padding: '3px 10px' }} onClick={() => handleSuggestion(s.id, true)}>
                        <CheckCircle size={12} /> Accept
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ gap: 4, padding: '3px 10px' }} onClick={() => handleSuggestion(s.id, false)}>
                        <X size={12} /> Dismiss
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.accepted ? 'var(--color-success)' : 'var(--color-neutral-600)' }}>
                      {s.accepted ? '✓ Accepted' : '✗ Dismissed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
