import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { Shield, ArrowRight, User, Building, Eye, EyeOff, Fingerprint, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  { icon: '🛡️', title: 'Secure Aadhaar Auth', desc: 'Identity-linked to your Aadhaar number' },
  { icon: '⚡', title: 'Real-time Updates', desc: 'Live complaint tracking & status changes' },
  { icon: '📊', title: 'AI-Powered', desc: 'Intelligent issue classification & routing' },
];

const ROLES = [
  { id: 'citizen', label: 'Citizen', icon: <User size={18} />, desc: 'Report & track issues', color: '#10B981', bg: '#D1FAE5' },
  { id: 'admin', label: 'Admin', icon: <Shield size={18} />, desc: 'Manage all complaints', color: '#3B82F6', bg: '#DBEAFE' },
  { id: 'department', label: 'Department', icon: <Building size={18} />, desc: 'Handle assignments', color: '#8B5CF6', bg: '#EDE9FE' },
];

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('aadhaar');
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, addToast } = useApp();
  const navigate = useNavigate();

  const selectedRoleInfo = ROLES.find(r => r.id === selectedRole);

  const handleNext = () => {
    if (!aadhaar) { setError('Please enter your Aadhaar Number'); return; }
    if (!/^\d{12}$/.test(aadhaar)) { setError('Must be exactly 12 digits'); return; }
    setError('');
    setStep('password');
  };

  const handleSubmit = async () => {
    if (!password) { setError('Please enter your password'); return; }
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        const res = await authService.signup(aadhaar, password, selectedRole);
        if (res.success) {
          addToast('Account created! Signing you in...', 'success');
          const data = await login(aadhaar, password);
          const routes = { citizen: '/citizen/home', admin: '/admin/dashboard', department: '/department/dashboard' };
          navigate(routes[data.role] || '/login');
        }
      } else {
        const data = await login(aadhaar, password);
        const routes = { citizen: '/citizen/home', admin: '/admin/dashboard', department: '/department/dashboard' };
        navigate(routes[data.role] || '/login');
        addToast(`Welcome back!`, 'success');
      }
    } catch (err) {
      setError(err.message || (tab === 'login' ? 'Invalid credentials' : 'Signup failed'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (newTab) => {
    setTab(newTab);
    setStep('aadhaar');
    setAadhaar('');
    setPassword('');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Left side - brand panel */}
      <div style={{
        background: 'linear-gradient(135deg, #1557C0 0%, #0D3E9A 50%, #0A2D75 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <img src="/logo.svg" alt="BharatCRS" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ color: 'white', fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700 }}>BharatCRS</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Civic Resolution System</div>
            </div>
          </div>

          <h1 style={{ color: 'white', fontFamily: 'Poppins, sans-serif', fontSize: 38, fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
            Empowering<br />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Citizens</span> for a<br />
            Better India
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7, marginBottom: 48, maxWidth: 360 }}>
            Report civic issues, track resolutions, and make your city work better — powered by AI.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div style={{ position: 'absolute', bottom: 32, left: 64, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500 }}>Secured by Aadhaar Infrastructure</span>
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {/* Right side - form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', background: '#F9FAFB' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: 4, marginBottom: 32, border: '1px solid #E5E7EB' }}>
            {[['login', 'Sign In'], ['signup', 'Create Account']].map(([t, label]) => (
              <button key={t} onClick={() => resetForm(t)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                background: tab === t ? '#1557C0' : 'transparent',
                color: tab === t ? 'white' : '#6B7280',
                boxShadow: tab === t ? '0 2px 8px rgba(21,87,192,0.3)' : 'none',
              }}>
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
            {tab === 'login' ? 'Sign in with your Aadhaar number' : 'Register using your 12-digit Aadhaar'}
          </p>

          {/* Role Selector (signup only) */}
          {tab === 'signup' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>I am a</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
                    padding: '10px 6px', borderRadius: 10,
                    border: `2px solid ${selectedRole === r.id ? r.color : '#E5E7EB'}`,
                    background: selectedRole === r.id ? r.bg : 'white',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', color: selectedRole === r.id ? r.color : '#9CA3AF', marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selectedRole === r.id ? r.color : '#374151' }}>{r.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Aadhaar */}
          {step === 'aadhaar' ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Aadhaar Number</label>
                <div style={{ position: 'relative' }}>
                  <Fingerprint size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    style={{
                      width: '100%', paddingLeft: 44, paddingRight: aadhaar.length === 12 ? 44 : 14,
                      padding: '12px 14px 12px 44px',
                      border: `1.5px solid ${error ? '#EF4444' : aadhaar.length === 12 ? '#10B981' : '#D1D5DB'}`,
                      borderRadius: 10, fontSize: 15, outline: 'none',
                      background: 'white', color: '#111827',
                      letterSpacing: aadhaar ? '0.15em' : 'normal',
                      transition: 'border-color 0.15s',
                      fontWeight: aadhaar ? 600 : 400,
                    }}
                    placeholder="Enter 12-digit Aadhaar"
                    maxLength={12}
                    value={aadhaar}
                    onChange={e => { setAadhaar(e.target.value.replace(/\D/g, '')); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && aadhaar.length === 12 && handleNext()}
                    onFocus={e => { if (!error) e.target.style.borderColor = '#1557C0'; e.target.style.boxShadow = '0 0 0 3px rgba(21,87,192,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : aadhaar.length === 12 ? '#10B981' : '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                  />
                  {aadhaar.length === 12 && (
                    <CheckCircle2 size={17} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                  )}
                </div>
                {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{error}</p>}
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>{aadhaar.length}/12 digits</p>
              </div>
              <button
                onClick={handleNext}
                disabled={aadhaar.length !== 12}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: aadhaar.length === 12 ? '#1557C0' : '#E5E7EB',
                  color: aadhaar.length === 12 ? 'white' : '#9CA3AF',
                  fontSize: 14, fontWeight: 600, cursor: aadhaar.length === 12 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                  boxShadow: aadhaar.length === 12 ? '0 4px 16px rgba(21,87,192,0.3)' : 'none',
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Step: Password */}
              <div style={{
                padding: '12px 16px', background: '#EFF6FF', borderRadius: 10,
                border: '1px solid #BFDBFE', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Fingerprint size={15} color="#3B82F6" />
                <span style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 500 }}>
                  Aadhaar: <strong style={{ letterSpacing: '0.12em' }}>{aadhaar}</strong>
                </span>
                <button onClick={() => { setStep('aadhaar'); setPassword(''); setError(''); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Change
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={{
                      width: '100%', padding: '12px 44px 12px 14px',
                      border: `1.5px solid ${error ? '#EF4444' : '#D1D5DB'}`,
                      borderRadius: 10, fontSize: 14, outline: 'none',
                      background: 'white', color: '#111827', transition: 'border-color 0.15s',
                    }}
                    placeholder={tab === 'signup' ? 'Create a password' : 'Enter your password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    onFocus={e => { e.target.style.borderColor = '#1557C0'; e.target.style.boxShadow = '0 0 0 3px rgba(21,87,192,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : '#D1D5DB'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button onClick={() => setShowPassword(s => !s)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0,
                  }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{error}</p>}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !password}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                  background: password ? (tab === 'signup' ? '#10B981' : '#1557C0') : '#E5E7EB',
                  color: password ? 'white' : '#9CA3AF',
                  fontSize: 14, fontWeight: 600,
                  cursor: loading || !password ? 'not-allowed' : 'pointer',
                  boxShadow: password ? `0 4px 16px ${tab === 'signup' ? 'rgba(16,185,129,0.3)' : 'rgba(21,87,192,0.3)'}` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Processing...' : tab === 'signup' ? '✓ Create Account & Sign In' : 'Sign In Securely'}
              </button>
            </>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 24 }}>
            By continuing, you agree to our{' '}
            <a href="#" style={{ color: '#1557C0', textDecoration: 'underline' }}>Terms</a>{' '}&amp;{' '}
            <a href="#" style={{ color: '#1557C0', textDecoration: 'underline' }}>Privacy</a>
          </p>
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="linear-gradient(135deg"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
