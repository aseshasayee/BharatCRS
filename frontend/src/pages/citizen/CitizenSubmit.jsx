import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { Upload, Mic, MicOff, MapPin, CheckCircle, RotateCcw, X, Camera, Image as ImageIcon, Video, Shield, Globe, Info, Send, Megaphone } from 'lucide-react';
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
  const [activeStep, setActiveStep] = useState(1);
  
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
    if (arr.length > 0) {
      setFiles([arr[0]]);
    }
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', overflow: 'hidden', gap: '20px' }}>
      
      {/* Horizontal Accordion / Columns */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
        {/* STEP 1: ISSUE DETAILS */}
        <div className="card" onClick={() => activeStep !== 1 && setActiveStep(1)} style={{ flex: activeStep === 1 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 1 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 1 ? 1 : 0.8 }}>
          {activeStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', gap: '20px', overflow: 'hidden' }}>
              
              {/* Language / Preferences */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Language of Description</label>
                  <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 14, width: '100%' }}>
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    Anonymous Reporting
                    <div onClick={() => setIsAnonymous(!isAnonymous)} style={{ width: 44, height: 24, borderRadius: 12, background: isAnonymous ? 'var(--color-primary)' : 'var(--color-neutral-300)', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: isAnonymous ? 22 : 2, transition: '0.3s' }}/>
                    </div>
                  </label>
                </div>
              </div>

              {/* Description Card */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderTop: '1px solid var(--color-neutral-100)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 18, margin: 0 }}>
                    <Megaphone size={20} color="var(--color-primary)" /> Issue Details
                  </h3>
                  <button onClick={toggleRecord} className={`btn btn-sm ${recording ? '' : 'btn-secondary'}`} style={{ padding: '8px 16px', borderRadius: 20, gap: 6, fontSize: 14, ...(recording ? { background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' } : {}) }}>
                    {recording ? <><MicOff size={16} /> Stop Recording</> : <><Mic size={16} /> Voice Input</>}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <textarea className="form-textarea" placeholder="Describe the issue in detail. The more context you provide, the faster it can be resolved..." value={description} onChange={e => setDescription(e.target.value.slice(0, 1000))} style={{ flex: 1, fontSize: 15, padding: 16, borderRadius: 12, border: '1.5px solid var(--color-neutral-200)', background: 'var(--color-neutral-50)', resize: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                    <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><CheckCircle size={12} color="var(--color-success)" /> AI will automatically categorize this issue</span>
                    <span className="form-hint" style={{ fontSize: 13 }}>{description.length}/1000</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)' }}>
              <Megaphone size={40} color="var(--color-neutral-600)" />
            </div>
          )}
        </div>

        {/* STEP 2: PHOTO EVIDENCE */}
        <div className="card" onClick={() => activeStep !== 2 && setActiveStep(2)} style={{ flex: activeStep === 2 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 2 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 2 ? 1 : 0.8 }}>
          {activeStep === 2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflow: 'hidden' }}>
              <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 18, margin: 0, marginBottom: 20 }}>
                <ImageIcon size={20} color="var(--color-primary)" /> Photo Evidence (Optional)
              </h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => files.length === 0 && fileRef.current?.click()}
                  style={{
                    padding: files.length > 0 ? 0 : '24px',
                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
                    borderRadius: 12,
                    background: dragOver ? 'var(--color-primary-light)' : 'var(--color-neutral-50)',
                    cursor: files.length === 0 ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...dragOver && { borderColor: 'var(--color-primary)' }
                  }}
                >
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFiles(e.target.files)} />
                  {files.length > 0 ? (
                    <>
                      <img src={URL.createObjectURL(files[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
                      <button onClick={(e) => { e.stopPropagation(); setFiles([]); }} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)' }}>
                        <X size={16} strokeWidth={3} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                      <div style={{ padding: 12, background: 'white', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <Upload size={24} color="var(--color-primary)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: 16, margin: 0 }}>Click or drag image to upload</p>
                        <p style={{ fontSize: 13, color: 'var(--color-neutral-500)', margin: 0 }}>High-quality photo (Max 20MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)' }}>
              <div style={{ width: 64, height: 64, background: 'black', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <ImageIcon size={32} color="white" />
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: LOCATION */}
        <div className="card" onClick={() => activeStep !== 3 && setActiveStep(3)} style={{ flex: activeStep === 3 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 3 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 3 ? 1 : 0.8 }}>
          {activeStep === 3 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 18, margin: 0 }}>
                  <MapPin size={20} color="var(--color-primary)" /> Exact Location
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={handleLocate} style={{ borderRadius: 20, gap: 6, padding: '8px 16px', fontSize: 14 }}>
                  <MapPin size={16} /> Detect Location
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', zIndex: 0, borderRadius: 12, border: '1px solid var(--color-neutral-200)', position: 'relative' }}>
                {position ? (
                  <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <LocationPicker position={position} setPosition={setPosition} />
                  </MapContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)', color: 'var(--color-neutral-500)' }}>
                    Loading map...
                  </div>
                )}
                {position && (
                  <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000 }}>
                    <MapPin size={18} color="var(--color-primary)" />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-neutral-700)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {locationText || `Lat: ${position[0].toFixed(5)}, Lon: ${position[1].toFixed(5)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)' }}>
              <MapPin size={40} color="black" />
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CENTER ACTION */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
        {activeStep < 3 ? (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setActiveStep(activeStep + 1)}
            style={{ padding: '16px 60px', fontSize: 16, fontWeight: 700, borderRadius: 30, boxShadow: '0 8px 25px rgba(29,78,216,0.2)', minWidth: 350, letterSpacing: '1px' }}>
            NEXT PAGE
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '16px 40px', fontSize: 16, fontWeight: 700, borderRadius: 30, boxShadow: '0 8px 25px rgba(29,78,216,0.3)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 350, justifyContent: 'center' }}>
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> 
              Processing via AI...</>
            ) : <><Send size={20} /> Submit Civic Complaint</>}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
