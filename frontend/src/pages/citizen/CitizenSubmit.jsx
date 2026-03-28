import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { Upload, Mic, MicOff, MapPin, CheckCircle, RotateCcw, X, Camera, Image as ImageIcon, Video, Shield, Globe, Info, Send, Megaphone } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

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

  // Helper to fetch location name
  const updatePosition = async (lat, lng) => {
    setPosition([lat, lng]);
    setLocationText('Fetching location name...');
    try {
      const apiKey = import.meta.env.VITE_MAPS_API_KEY;
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const addr = data.results[0].formatted_address;
        const parts = addr.split(',');
        setLocationText(parts.slice(0, 3).join(','));
      } else {
        setLocationText(`Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`);
      }
    } catch (e) {
      setLocationText(`Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`);
    }
  };

  // Try to default location to Chennai or user's current location on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        updatePosition(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        updatePosition(13.0827, 80.2707); // Default Chennai
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
        updatePosition(pos.coords.latitude, pos.coords.longitude);
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
        <div className="card" onClick={() => activeStep !== 1 && setActiveStep(1)} style={{ flex: activeStep === 1 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 1 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 1 ? 1 : 0.8, borderRadius: 20 }}>
          {activeStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px', gap: '20px', overflow: 'hidden', background: 'linear-gradient(to bottom right, #ffffff, #f8faff)' }}>
              
              {/* Language / Preferences */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--color-neutral-600)', textTransform: 'uppercase', letterSpacing: 1 }}>Language</label>
                  <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, width: '100%', border: '1px solid var(--color-neutral-200)', outline: 'none', background: 'white' }}>
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, color: 'var(--color-neutral-600)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Anonymous
                    <div onClick={() => setIsAnonymous(!isAnonymous)} style={{ width: 48, height: 26, borderRadius: 13, background: isAnonymous ? 'var(--color-primary)' : 'var(--color-neutral-300)', position: 'relative', cursor: 'pointer', transition: '0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: isAnonymous ? 24 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}/>
                    </div>
                  </label>
                </div>
              </div>

              {/* Description Card */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 20, margin: 0, fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                    <Megaphone size={22} color="var(--color-primary)" /> Issue Details
                  </h3>
                  <button onClick={toggleRecord} className={`btn btn-sm ${recording ? '' : 'btn-secondary'}`} style={{ padding: '10px 18px', borderRadius: 24, gap: 8, fontSize: 14, fontWeight: 600, transition: 'all 0.2s', ...(recording ? { background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5', boxShadow: '0 0 0 4px rgba(220,38,38,0.1)' } : { background: 'white', border: '1px solid var(--color-neutral-200)' }) }}>
                    {recording ? <><MicOff size={16} /> Recording...</> : <><Mic size={16} /> Voice Input</>}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <textarea className="form-textarea" placeholder="Describe the issue in detail. The more context you provide, the faster it can be resolved..." value={description} onChange={e => setDescription(e.target.value.slice(0, 1000))} style={{ flex: 1, fontSize: 16, lineHeight: 1.6, padding: 20, borderRadius: 16, border: '1px solid var(--color-primary-light)', background: 'var(--color-neutral-50)', resize: 'none', outline: 'none', transition: 'box-shadow 0.2s', ':focus': { boxShadow: '0 0 0 3px rgba(29,78,216,0.1)', background: 'white' } }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                    <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--color-success)' }}><CheckCircle size={14} /> AI will categorize & route this</span>
                    <span className="form-hint" style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-neutral-400)' }}>{description.length} / 1000</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)', gap: 16 }}>
              <Megaphone size={32} color="var(--color-neutral-400)" />
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, color: 'var(--color-neutral-400)', letterSpacing: 2, fontSize: 15 }}>ISSUE DETAILS</span>
            </div>
          )}
        </div>

        {/* STEP 2: PHOTO EVIDENCE */}
        <div className="card" onClick={() => activeStep !== 2 && setActiveStep(2)} style={{ flex: activeStep === 2 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 2 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 2 ? 1 : 0.8, borderRadius: 20 }}>
          {activeStep === 2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px', overflow: 'hidden', background: 'linear-gradient(to bottom right, #ffffff, #f8faff)' }}>
              <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 20, margin: 0, marginBottom: 24, fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                <ImageIcon size={22} color="var(--color-primary)" /> Photo Evidence <span style={{ fontSize: 13, color: 'var(--color-neutral-400)', fontWeight: 500 }}>(Optional but recommended)</span>
              </h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => files.length === 0 && fileRef.current?.click()}
                  style={{
                    padding: files.length > 0 ? 0 : '32px',
                    border: `2.5px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
                    borderRadius: 16,
                    background: dragOver ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.8)',
                    cursor: files.length === 0 ? 'pointer' : 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: dragOver ? '0 0 0 4px rgba(29,78,216,0.1)' : 'none',
                    ...dragOver && { borderColor: 'var(--color-primary)' }
                  }}
                >
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFiles(e.target.files)} />
                  {files.length > 0 ? (
                    <>
                      <img src={URL.createObjectURL(files[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, borderRadius: 14 }} />
                      <button onClick={(e) => { e.stopPropagation(); setFiles([]); }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(8px)', transition: '0.2s', ':hover': { background: 'rgba(0,0,0,0.8)', transform: 'scale(1.05)' } }}>
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    </>
                  ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                      <div style={{ padding: 16, background: 'white', borderRadius: '50%', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                        <Upload size={32} color="var(--color-primary)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-neutral-800)', fontSize: 18, margin: '0 0 6px 0' }}>Click or drag image to upload</p>
                        <p style={{ fontSize: 14, color: 'var(--color-neutral-500)', margin: 0 }}>High-quality photo (.jpg, .png, Max 20MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)', gap: 16 }}>
              <ImageIcon size={32} color="var(--color-neutral-400)" />
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, color: 'var(--color-neutral-400)', letterSpacing: 2, fontSize: 15 }}>EVIDENCE</span>
            </div>
          )}
        </div>

        {/* STEP 3: LOCATION */}
        <div className="card" onClick={() => activeStep !== 3 && setActiveStep(3)} style={{ flex: activeStep === 3 ? 5 : 0.8, transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: activeStep === 3 ? 'default' : 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: activeStep === 3 ? 1 : 0.8, borderRadius: 20 }}>
          {activeStep === 3 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px', overflow: 'hidden', background: 'linear-gradient(to bottom right, #ffffff, #f8faff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 className="card-title" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 20, margin: 0, fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                  <MapPin size={22} color="var(--color-primary)" /> Exact Location
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={handleLocate} style={{ borderRadius: 24, gap: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, background: 'white', border: '1px solid var(--color-neutral-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <MapPin size={16} color="var(--color-primary)" /> Auto Detect
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', zIndex: 0, borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                {position ? (
                  <APIProvider apiKey={import.meta.env.VITE_MAPS_API_KEY} libraries={['marker']}>
                    <Map
                      defaultCenter={{ lat: position[0], lng: position[1] }}
                      defaultZoom={15}
                      gestureHandling={'greedy'}
                      disableDefaultUI={true}
                      onClick={(e) => {
                        if (e.detail.latLng) {
                          const lat = e.detail.latLng.lat;
                          const lng = e.detail.latLng.lng;
                          updatePosition(lat, lng);
                        }
                      }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Marker position={{ lat: position[0], lng: position[1] }} />
                    </Map>
                  </APIProvider>
                ) : (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, justifyContent: 'center', background: 'var(--color-neutral-100)', color: 'var(--color-neutral-500)' }}>
                    <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--color-neutral-300)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontWeight: 500 }}>Initializing Real World Map...</span>
                  </div>
                )}
                {position && (
                  <div style={{ position: 'absolute', bottom: 16, left: 16, maxWidth: 'calc(100% - 32px)', display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: 30, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 1000, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ background: 'var(--color-primary-light)', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Globe size={14} color="var(--color-primary)" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {locationText || `Lat: ${position[0].toFixed(5)}, Lon: ${position[1].toFixed(5)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-100)', gap: 16 }}>
              <MapPin size={32} color="var(--color-neutral-400)" />
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, color: 'var(--color-neutral-400)', letterSpacing: 2, fontSize: 15 }}>LOCATION</span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CENTER ACTION */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
        {activeStep < 3 ? (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setActiveStep(activeStep + 1)}
            style={{ padding: '18px 60px', fontSize: 17, fontWeight: 700, borderRadius: 30, boxShadow: '0 8px 30px rgba(29,78,216,0.25)', minWidth: 350, letterSpacing: '1px', transition: 'all 0.3s ease' }}>
            CONTINUE TO NEXT STEP
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '18px 40px', fontSize: 17, fontWeight: 700, borderRadius: 30, boxShadow: '0 8px 30px rgba(29,78,216,0.3)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 350, justifyContent: 'center', transition: 'all 0.3s ease' }}>
            {loading ? (
              <><span className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> 
              Processing via AI...</>
            ) : <><Send size={22} /> Submit Civic Complaint</>}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .upload-zone:hover { border-color: var(--color-primary) !important; background: var(--color-primary-light) !important; }
      `}</style>
    </div>
  );
}
