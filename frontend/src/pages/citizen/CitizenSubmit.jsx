import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, WARDS } from '../../data/mockData';
import MapComponent from '../../components/MapComponent';
import { Upload, Mic, MicOff, MapPin, Sparkles, CheckCircle, RotateCcw, X, Camera, Image as ImageIcon, Video } from 'lucide-react';

export default function CitizenSubmit() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [ward, setWard] = useState('');
  const [category, setCategory] = useState('road');
  const [aiConfirmed, setAiConfirmed] = useState(true);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFiles = (f) => {
    const arr = Array.from(f).filter(file => file.size < 20 * 1024 * 1024);
    setFiles(prev => [...prev, ...arr].slice(0, 5));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(
      () => { setLocation('80 Feet Road, Koramangala, Bengaluru - 560034'); addToast('Location detected!', 'success'); },
      () => addToast('Could not get location. Please enter manually.', 'warning')
    );
  };

  const toggleRecord = () => {
    setRecording(r => !r);
    if (recording) {
      setDescription('Large pothole on 80 Feet Road causing damage to vehicles and safety hazard for motorists.');
      addToast('Voice transcribed!', 'success');
    }
  };

  const handleSubmit = () => {
    if (!description) { addToast('Please describe the issue', 'error'); return; }
    if (!location) { addToast('Please provide location', 'error'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/citizen/submit/success'); }, 1500);
  };

  const AI_SUGGESTION = CATEGORIES.find(c => c.id === 'road');

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Report a Civic Issue</h2>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Help us improve your city by reporting issues in your area.</p>
      </div>

      {/* Media Upload */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Camera size={20} /> Media Upload</h3></div>
        <div className="card-body">
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" multiple accept="image/*,video/mp4" hidden onChange={e => handleFiles(e.target.files)} />
            <Upload size={32} color="var(--color-neutral-400)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: 4 }}>Drag & drop photos or videos</p>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginBottom: 16 }}>JPG, PNG, MP4 — Max 20MB each</p>
            <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
              Browse Files
            </button>
          </div>
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {files.map((f, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--color-neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1px solid var(--color-neutral-200)' }}>
                    {f.type.startsWith('image') ? <ImageIcon size={32} color="var(--color-neutral-400)" /> : <Video size={32} color="var(--color-neutral-400)" />}
                  </div>
                  <button
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: -4, right: -4, background: 'var(--color-danger)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Voice + Description */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Mic size={20} /> Voice & Description</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={toggleRecord}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: recording ? 'var(--color-danger)' : 'var(--color-neutral-300)',
                background: recording ? 'var(--color-danger-light)' : 'white',
                color: recording ? 'var(--color-danger)' : 'var(--color-neutral-700)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
              }}>
              {recording ? <><MicOff size={16} /><span>Stop Recording</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', animation: 'pulse 1s infinite' }} />
              </> : <><Mic size={16} /> <span>Record Voice</span></>}
            </button>
            {description && (
              <button onClick={() => setDescription('')} className="btn btn-secondary btn-sm">
                <RotateCcw size={14} /> Clear
              </button>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              rows={4}
            />
            <span className="form-hint" style={{ textAlign: 'right' }}>{description.length}/500</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={20} /> Location</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleLocate} style={{ alignSelf: 'flex-start', gap: 8 }}>
            <MapPin size={16} /> Use My Current Location
          </button>
          <MapComponent complaints={[]} height={220} center={[12.9352, 77.6245]} zoom={14} />
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" placeholder="Enter or confirm address..." value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ward / Area</label>
            <select className="form-select" value={ward} onChange={e => setWard(e.target.value)}>
              <option value="">Select ward...</option>
              {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Category */}
      <div className="card">
        <div className="card-header"><h3 className="card-title"><Sparkles size={16} style={{ marginRight: 6 }} />AI Category Detection</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI suggestion */}
          <div style={{
            background: 'var(--color-primary-light)', borderRadius: 10, padding: '12px 16px',
            border: '1.5px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Suggestion</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{AI_SUGGESTION?.label}</span>
                <span style={{ fontSize: 12, background: 'var(--color-primary)', color: 'white', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>87% confident</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setCategory('road'); setAiConfirmed(true); addToast('Category confirmed', 'success'); }}
                className="btn btn-sm"
                style={{ background: aiConfirmed ? 'var(--color-success)' : 'white', color: aiConfirmed ? 'white' : 'var(--color-success)', border: '1.5px solid var(--color-success)' }}>
                <CheckCircle size={13} /> {aiConfirmed ? 'Confirmed' : 'Confirm'}
              </button>
              <button onClick={() => setAiConfirmed(false)} className="btn btn-secondary btn-sm">Change</button>
            </div>
          </div>
          {!aiConfirmed && (
            <div className="form-group">
              <label className="form-label">Select Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: '2px solid',
                      borderColor: category === c.id ? 'var(--color-primary)' : 'var(--color-neutral-200)',
                      background: category === c.id ? 'var(--color-primary-light)' : 'white',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: category === c.id ? 'var(--color-primary)' : 'var(--color-neutral-700)' }}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleSubmit}
        disabled={loading}
        style={{ marginBottom: 16, boxShadow: '0 4px 20px rgba(29,78,216,0.3)' }}>
        {loading ? (
          <><span className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Submitting...</>
        ) : '🚀 Submit Complaint'}
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
