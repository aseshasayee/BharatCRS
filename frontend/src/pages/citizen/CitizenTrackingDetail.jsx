import { useParams, useNavigate } from 'react-router-dom';
import { COMPLAINTS, getCategoryById, formatDateTime } from '../../data/mockData';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { ArrowLeft, Check, Clock, MapPin, Calendar, Building, BarChart2, CheckCircle2, Hourglass, ClipboardList, MessageSquare } from 'lucide-react';

const STEPS = ['submitted', 'verified', 'assigned', 'inprogress', 'resolved'];

export default function CitizenTrackingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = COMPLAINTS.find(x => x.id === id) || COMPLAINTS[0];
  if (!c) return <div>Complaint not found</div>;

  const cat = getCategoryById(c.category);
  const currentStep = STEPS.indexOf(c.status === 'escalated' ? 'inprogress' : c.status);

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Back */}
      <button onClick={() => navigate('/citizen/tracking')} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', gap: 6 }}>
        <ArrowLeft size={14} /> Back to My Complaints
      </button>

      {/* Header */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-600)', fontFamily: 'monospace', marginBottom: 4 }}>{c.id}</p>
              <h2 style={{ fontFamily: 'Poppins', fontSize: 22, fontWeight: 700 }}>{c.title}</h2>
              <p style={{ fontsize: 13, color: 'var(--color-neutral-600)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {c.location}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={c.status} />
              <PriorityBadge priority={c.priority} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--color-neutral-600)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> Submitted: {formatDateTime(c.submittedAt)}</span>
            {c.assignedDept && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building size={13} /> Assigned to: {c.assignedDept}</span>}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BarChart2 size={20} /> Status Timeline</h3></div>
        <div className="card-body">
          {/* Horizontal step bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 32 }}>
            <div style={{ position: 'absolute', top: 15, left: '10%', right: '10%', height: 2, background: 'var(--color-neutral-200)', zIndex: 0 }} />
            {c.timeline.map((step, i) => {
              const done = step.done;
              const active = i === currentStep;
              return (
                <div key={step.step} style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto 8px',
                    background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-neutral-200)',
                    border: `2px solid ${done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13,
                    boxShadow: active ? '0 0 0 4px rgba(29,78,216,0.2)' : 'none',
                  }}>
                    {done ? <Check size={14} /> : active ? <Clock size={14} /> : i + 1}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: done || active ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)' }}>{step.label}</p>
                  {step.time && <p style={{ fontSize: 10, color: 'var(--color-neutral-600)', marginTop: 2 }}>{formatDateTime(step.time)}</p>}
                </div>
              );
            })}
          </div>

          {/* Step details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.timeline.filter(s => s.done || s.step === c.status).map(step => (
              <div key={step.step} style={{
                display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 10,
                background: step.done ? 'var(--color-success-light)' : 'var(--color-primary-light)',
                border: `1px solid ${step.done ? 'var(--color-success)' : 'var(--color-primary)'}22`,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', color: step.done ? 'var(--color-success)' : 'var(--color-primary)' }}>{step.done ? <CheckCircle2 size={18} /> : <Hourglass size={18} />}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{step.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 2 }}>{step.desc}</p>
                  {step.time && <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{formatDateTime(step.time)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details + Map */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ClipboardList size={20} /> Details</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>CATEGORY</p>
              <p style={{ fontSize: 14 }}>{cat.label}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>DESCRIPTION</p>
              <p style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{c.description}</p>
            </div>
            {c.assignedDept && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>ASSIGNED TO</p>
                <p style={{ fontSize: 14 }}>{c.assignedDept}</p>
              </div>
            )}
            {c.slaDeadline && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>SLA DEADLINE</p>
                <p style={{ fontSize: 14 }}>{formatDateTime(c.slaDeadline)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={20} /> Location</h3></div>
          <MapComponent complaints={[c]} height={200} center={[c.lat, c.lng]} zoom={15} />
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{c.location}</p>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MessageSquare size={20} /> Updates & Comments</h3></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.timeline.filter(s => s.done).map(step => (
            <div key={step.step} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--color-neutral-50)', borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{step.label}: </span>
                <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{step.desc}</span>
                {step.time && <p style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 2 }}>{formatDateTime(step.time)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
