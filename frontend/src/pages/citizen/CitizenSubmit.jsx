import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { Upload, Mic, MicOff, MapPin, CheckCircle, RotateCcw, X, Camera, Image as ImageIcon, Video, Shield, Globe, Info, Send } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons dynamically
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map clicks for location selection
function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function CitizenSubmit() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  
  // Form State
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(null); // [lat, lng]
  const [locationText, setLocationText] = useState('');
  const [language, setLanguage] = useState('en');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // UI State
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  // Try to default location to Chennai or user's current location on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocationText(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
      },
      () => {
        setPosition([13.0827, 80.2707]); // Default Chennai
        addToast('Please select your location on the map.', 'info');
      }
    );
  }, []);

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
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocationText(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        addToast('Exact location detected!', 'success');
      },
      () => addToast('Could not get location. Please click on the map.', 'warning')
    );
  };

  const toggleRecord = () => {
    setRecording(r => !r);
    if (recording) {
      // Mock transcription
      setDescription(prev => prev + (prev ? ' ' : '') + 'Pothole on the main road causing traffic delays.');
      addToast('Voice transcribed successfully!', 'success');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || description.length < 10) { 
      addToast('Please provide a detailed description (min 10 chars).', 'error'); 
      return; 
    }
    if (!position || position.length !== 2) { 
      addToast('Please pin the location on the map.', 'error'); 
      return; 
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('raw_text', description);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      formData.append('language', language);
      formData.append('submission_channel', 'Web App');
      formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
      
      if (files.length > 0) {
        formData.append('photo', files[0]); // Only taking the first photo for now
      }

      await complaintService.submitComplaint(formData);
      setLoading(false);
      addToast('Complaint submitted successfully!', 'success');
      navigate('/citizen/submit/success');
    } catch (err) {
      setLoading(false);
      addToast(err.message || 'Error submitting complaint', 'error');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
        borderRadius: 16,
        padding: '32px',
        color: 'white',
        boxShadow: '0 10px 25px rgba(29, 78, 216, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 32, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Camera size={32} /> Report an Issue
          </h2>
          <p style={{ fontSize: 15, opacity: 0.9, marginTop: 8, maxWidth: 500, lineHeight: 1.5 }}>
            Help us build a better city. Describe the issue, pin the location, and let our AI handle the routing and prioritization.
          </p>
        </div>
        <div style={{ position: 'absolute', right: -20, top: -40, opacity: 0.1 }}>
          <Shield size={250} />
        </div>
      </div>

      {/* Media Upload Card */}
      <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
          <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 18 }}>
            <ImageIcon size={20} color="var(--color-primary)" /> Photo Evidence (Optional)
          </h3>
        </div>
        <div className="card-body">
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '32px',
              border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
              borderRadius: 12,
              background: dragOver ? 'var(--color-primary-light)' : 'var(--color-neutral-50)',
              ...dragOver && { borderColor: 'var(--color-primary)' }
            }}
          >
            <input ref={fileRef} type="file" multiple accept="image/*" hidden onChange={e => handleFiles(e.target.files)} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: 16, background: 'white', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <Upload size={28} color="var(--color-primary)" />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: 16, margin: 0 }}>
                Click or drag image to upload
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-500)', margin: 0 }}>
                High-quality photos help AI classify accurately (Max 20MB)
              </p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              {files.map((f, i) => (
                <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <img src={URL.createObjectURL(f)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)' }}>
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description Card */}
      <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 18 }}>
            <Info size={20} color="var(--color-primary)" /> Issue Details
          </h3>
          <button
            onClick={toggleRecord}
            className={`btn btn-sm ${recording ? '' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px', borderRadius: 20, gap: 6,
              ...(recording ? { background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' } : {})
            }}>
            {recording ? <><MicOff size={14} /> Stop Recording</> : <><Mic size={14} /> Voice Input</>}
          </button>
        </div>
        <div className="card-body" style={{ padding: 24 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <textarea
              className="form-textarea"
              placeholder="Describe the issue in detail. The more context you provide, the faster it can be resolved..."
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 1000))}
              rows={5}
              style={{ fontSize: 15, padding: 16, borderRadius: 12, border: '1.5px solid var(--color-neutral-200)', background: 'var(--color-neutral-50)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} color="var(--color-success)" /> AI will automatically categorize this issue
              </span>
              <span className="form-hint">{description.length}/1000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Location Card */}
      <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 18 }}>
            <MapPin size={20} color="var(--color-primary)" /> Exact Location
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={handleLocate} style={{ borderRadius: 20, gap: 6 }}>
            <MapPin size={14} /> Detect Location
          </button>
        </div>
        <div className="card-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-600)' }}>
            Click anywhere on the map to pin the exact location of the issue.
          </p>
          <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-neutral-200)', zIndex: 0 }}>
            {position && (
              <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <LocationPicker position={position} setPosition={setPosition} />
              </MapContainer>
            )}
          </div>
          {position && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-neutral-50)', padding: '12px 16px', borderRadius: 8 }}>
              <MapPin size={16} color="var(--color-primary)" />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-neutral-700)' }}>
                {locationText || `Lat: ${position[0].toFixed(5)}, Lon: ${position[1].toFixed(5)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Preferences Card */}
      <div className="card" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-neutral-100)' }}>
          <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 18 }}>
            <Globe size={20} color="var(--color-primary)" /> Submission Preferences
          </h3>
        </div>
        <div className="card-body" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Language of Description</label>
            <select 
              className="form-select" 
              value={language} 
              onChange={e => setLanguage(e.target.value)}
              style={{ padding: 12, borderRadius: 8 }}
            >
              <option value="en">English</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              Anonymous Reporting
              <div 
                component="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                style={{
                  width: 44, height: 24, borderRadius: 12, 
                  background: isAnonymous ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  position: 'relative', cursor: 'pointer', transition: '0.3s'
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2, left: isAnonymous ? 22 : 2, transition: '0.3s'
                }}/>
              </div>
            </label>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-500)', marginTop: 4 }}>
              If enabled, your personal details will be hidden from public logs.
            </p>
          </div>

        </div>
      </div>

      {/* Submit Button */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleSubmit}
        disabled={loading}
        style={{ 
          padding: '18px 0', 
          fontSize: 18, 
          fontWeight: 700,
          borderRadius: 12,
          boxShadow: '0 8px 25px rgba(29,78,216,0.3)',
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          marginTop: 10
        }}>
        {loading ? (
          <><span className="spinner" style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> 
          Processing via AI...</>
        ) : <><Send size={22} /> Submit Civic Complaint</>}
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
