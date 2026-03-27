import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Shield, Phone, ArrowRight, RefreshCw, User, Building } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);
  const { login, addToast } = useApp();
  const navigate = useNavigate();

  const startTimer = () => {
    setTimer(30);
    const interval = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleSendOtp = () => {
    if (!phone) { setError('Please enter your phone number or email'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      startTimer();
      addToast('OTP sent successfully!', 'success');
    }, 1000);
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(selectedRole);
      const routes = { citizen: '/citizen/home', admin: '/admin/dashboard', department: '/department/dashboard' };
      navigate(routes[selectedRole]);
      addToast(`Welcome! Logged in as ${selectedRole}`, 'success');
    }, 1000);
  };

  const ROLES = [
    { id: 'citizen', label: 'Citizen', icon: <User size={24} />, desc: 'Report & track civic issues' },
    { id: 'admin', label: 'Admin', icon: <Shield size={24} />, desc: 'Manage & oversee all issues' },
    { id: 'department', label: 'Department', icon: <Building size={24} />, desc: 'Handle assigned complaints' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FBFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--color-primary)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1px solid var(--color-primary-light)',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 28 }}>B</span>
          </div>
          <h1 style={{ color: '#111827', fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            BharatCRS
          </h1>
          <p style={{ color: '#4B5563', fontSize: 14 }}>Civic Resolution Reporting System</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20, padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--color-neutral-100)',
            borderRadius: 10, padding: 4, marginBottom: 28,
          }}>
            {['login', 'signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setStep('phone'); setOtp(['','','','','','']); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  transition: 'all 0.2s',
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-neutral-600)',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                }}>
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-700)', display: 'block', marginBottom: 10 }}>
              Login as
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setSelectedRole(r.id)}
                  style={{
                    padding: '10px 8px', borderRadius: 10, border: '2px solid',
                    borderColor: selectedRole === r.id ? 'var(--color-primary)' : 'var(--color-neutral-200)',
                    background: selectedRole === r.id ? 'var(--color-primary-light)' : 'white',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center', color: selectedRole === r.id ? 'var(--color-primary)' : 'var(--color-neutral-600)' }}>{r.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedRole === r.id ? 'var(--color-primary)' : 'var(--color-neutral-900)' }}>
                    {r.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {step === 'phone' ? (
            <>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Phone Number or Email</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="+91 98765 43210 or email@example.com"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
                {error && <span className="form-error">{error}</span>}
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleSendOtp} disabled={loading}>
                {loading ? 'Sending...' : <><span>Send OTP</span><ArrowRight size={16} /></>}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: 'var(--color-neutral-600)' }}>
                  OTP sent to <strong>{phone}</strong>
                </p>
              </div>
              <div className="otp-inputs" style={{ marginBottom: 20 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-digit"
                    type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              {error && <p className="form-error" style={{ textAlign: 'center', marginBottom: 12 }}>{error}</p>}
              <button className="btn btn-primary btn-full btn-lg" onClick={handleVerify} disabled={loading} style={{ marginBottom: 16 }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-neutral-600)' }}>
                {timer > 0 ? (
                  <span>Resend OTP in <strong>{timer}s</strong></span>
                ) : (
                  <button
                    onClick={() => { startTimer(); addToast('OTP resent', 'info'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} /> Resend OTP
                  </button>
                )}
              </div>
              <button
                onClick={() => { setStep('phone'); setOtp(['','','','','','']); }}
                style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--color-neutral-600)', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                ← Change number
              </button>
            </>
          )}

          <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-neutral-200)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-neutral-200)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['Aadhaar', 'Google'].map(label => (
              <button key={label}
                disabled title="Coming soon"
                style={{
                  padding: '10px', border: '1.5px solid var(--color-neutral-200)',
                  borderRadius: 8, background: 'var(--color-neutral-50)',
                  fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.5,
                }}>
                {label}
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 20 }}>
            By continuing, you agree to our{' '}
            <a href="#" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms</a> &{' '}
            <a href="#" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
