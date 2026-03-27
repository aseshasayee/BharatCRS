import { useNavigate } from 'react-router-dom';
import { CheckCircle, List, PlusCircle } from 'lucide-react';

export default function CitizenSubmitSuccess() {
  const navigate = useNavigate();
  const complaintId = 'BHR-2024-' + String(Math.floor(Math.random() * 900) + 100);

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'var(--color-success-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        <CheckCircle size={44} color="var(--color-success)" />
      </div>

      <div>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Complaint Submitted!</h2>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 15 }}>Your complaint has been registered and will be reviewed shortly.</p>
      </div>

      <div style={{
        background: 'var(--color-neutral-100)', borderRadius: 16, padding: '20px 32px',
        border: '1px solid var(--color-neutral-200)', width: '100%',
      }}>
        <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complaint ID</p>
        <p style={{ fontFamily: 'Poppins', fontSize: 26, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>{complaintId}</p>
        <span className="badge badge-submitted" style={{ fontSize: 12 }}>Submitted — Under Review</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/citizen/tracking')} style={{ gap: 8 }}>
          <List size={18} /> Track This Complaint
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/citizen/submit')} style={{ gap: 8 }}>
          <PlusCircle size={16} /> Raise Another Complaint
        </button>
        <button className="btn btn-ghost btn-full" onClick={() => navigate('/citizen/home')}>
          Back to Home
        </button>
      </div>

      <style>{`@keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}
