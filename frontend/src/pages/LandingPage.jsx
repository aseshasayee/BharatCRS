import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Target, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8FBFC' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 20 }}>
            B
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'Poppins, sans-serif' }}>BharatCRS</span>
        </div>
        <button className="btn btn-primary" style={{ padding: '10px 32px', borderRadius: '40px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }} onClick={() => navigate('/login')}>
          Login
        </button>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px', position: 'relative' }}>
        {/* Background decorative blob */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '50%', height: '120%', background: '#EBF1FA', borderRadius: '50% 0 0 50%', zIndex: 0, opacity: 0.8 }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%' }}>
          
          {/* Hero Text Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h1 style={{ fontSize: 62, fontWeight: 800, color: '#111827', lineHeight: 1.15, fontFamily: 'Poppins, sans-serif' }}>
              Civic Resolution<br />
              <span style={{ color: 'var(--color-primary)' }}>Reporting System</span>
            </h1>
            <p style={{ fontSize: 18, color: '#4B5563', lineHeight: 1.6, maxWidth: 480 }}>
              Report civic issues and let AI prioritize them efficiently. Helping cities build faster, smarter, and cleaner environments block by block.
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-lg" style={{ borderRadius: '40px', padding: '16px 40px', fontSize: 16 }} onClick={() => navigate('/login')}>
                Submit a Complaint
              </button>
            </div>
          </div>

          {/* Hero Illustration */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src="/hero-illustration.png" alt="Civic Reporting Illustration" style={{ width: '100%', maxWidth: 500, height: 'auto', objectFit: 'contain' }} />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section style={{ padding: '64px 48px', background: 'transparent', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 1100, width: '100%' }}>
          {[
            { icon: <ClipboardCheck size={32} color="var(--color-primary)" />, title: 'Easy Reporting', desc: 'Quickly report any issue with a few taps. Add photos, voice notes, and exact locations.' },
            { icon: <Target size={32} color="var(--color-primary)" />, title: 'Fair Prioritization', desc: 'AI ensures high-impact problems are addressed first based on severity and density.' },
            { icon: <TrendingUp size={32} color="var(--color-primary)" />, title: 'Track Progress', desc: 'Monitor the status of your complaints in real-time. Receive updates instantly.' }
          ].map((feat, i) => (
            <div key={i} style={{ background: 'white', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {feat.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{feat.title}</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Media Queries for Responsiveness */}
      <style>{`
        @media (max-width: 1024px) {
          main > div { grid-template-columns: 1fr !important; text-align: center; }
          main > div > div:first-child { align-items: center; }
          main > div > div p { text-align: center; margin: 0 auto; }
          h1 { fontSize: 48px !important; }
        }
        @media (max-width: 768px) {
          section > div { grid-template-columns: 1fr !important; }
          header { padding: 20px 24px !important; }
          main { padding: 32px 24px !important; }
          section { padding: 48px 24px !important; }
          h1 { font-size: 36px !important; }
        }
      `}</style>
    </div>
  );
}
