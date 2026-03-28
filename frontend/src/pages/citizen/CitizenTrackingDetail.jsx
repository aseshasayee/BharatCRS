import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { complaintService } from '../../services/complaintService';
import { formatDateTime, DOMAIN_EMOJIS } from '../../utils/helpers';
import { StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import MapComponent from '../../components/MapComponent';
import { ArrowLeft, Check, Clock, MapPin, Calendar, Building, BarChart2, CheckCircle2, Hourglass, ClipboardList, MessageSquare } from 'lucide-react';

const STATUS_STEPS = ['submitted', 'verified', 'assigned', 'in_progress', 'resolved'];
const STEP_LABELS = { submitted: 'Submitted', verified: 'Verified', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved' };
const STEP_DESCS = {
  submitted: 'Your complaint has been received and is under review.',
  verified: 'The complaint has been verified by the system.',
  assigned: 'The complaint has been assigned to the relevant department.',
  in_progress: 'The department is actively working on this issue.',
  resolved: 'The issue has been resolved. Thank you for reporting.',
};

const formatSlug = (str) => {
  if (!str) return '';
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function CitizenTrackingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    complaintService.getComplaint(id)
      .then(data => setComplaint(data))
      .catch(() => setError('Complaint not found or could not be loaded.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-neutral-500)' }}>Loading complaint details...</div>;
  if (error || !complaint) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>
      {error || 'Complaint not found.'}
      <br />
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/citizen/tracking')}>Go back</button>
    </div>
  );

  const c = complaint;
  const meta = c.common_metadata || {};
  const spatio = c.spatio_temporal_core || {};
  const domain = c.domain_classification || {};
  const priority = c.priority_assessment || {};
  
  const loc = spatio.location || {};
  const rawStatus = meta.status || 'Pending';
  
  // Map exact backend ENUMS to our UI timeline steps
  const STATUS_MAP = {
    'Pending': 'submitted',
    'Human Review': 'submitted', 
    'In Process': 'verified',
    'Assigned': 'assigned',
    'In Progress': 'in_progress',
    'Resolved': 'resolved',
    'SLA Breached': 'in_progress',
    'ESCALATED': 'in_progress'
  };
  
  const mappedStatus = STATUS_MAP[rawStatus] || 'submitted';
  const currentStep = STATUS_STEPS.indexOf(mappedStatus);
  const emoji = DOMAIN_EMOJIS[domain.primary_domain] || '📋';

  const lat = loc.latitude;
  const lon = loc.longitude;
  const hasCoords = lat && lon;
  
  const wardId = spatio.administrative_unit?.ward_id;
  const wardText = wardId ? `Ward ${wardId}` : 'Chennai';

  const timeline = STATUS_STEPS.map((step, i) => ({
    step,
    label: STEP_LABELS[step],
    desc: STEP_DESCS[step],
    done: i < currentStep || (step === 'resolved' && mappedStatus === 'resolved'),
    active: step === mappedStatus,
  }));

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
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-600)', fontFamily: 'monospace', marginBottom: 4 }}>{meta.report_id}</p>
              <h2 style={{ fontFamily: 'Poppins', fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>{emoji} {formatSlug(domain.issue_type || domain.sub_domain) || 'Civic Complaint'}</h2>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {wardText}{loc.address ? ` — ${loc.address}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={rawStatus} />
              <PriorityBadge priority={priority.priority_class} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--color-neutral-600)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> Submitted: {formatDateTime(meta.submission_timestamp)}</span>
            {domain.assigned_department && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building size={13} /> Assigned to: {domain.assigned_department}</span>}
          </div>
          {/* Description */}
          <div style={{ background: 'var(--color-neutral-50)', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--color-neutral-700)', lineHeight: 1.6 }}>
            {c.normalized_input?.raw_text || meta.raw_text || 'No description available.'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BarChart2 size={20} /> Status Timeline</h3></div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 32 }}>
            <div style={{ position: 'absolute', top: 15, left: '10%', right: '10%', height: 2, background: 'var(--color-neutral-200)', zIndex: 0 }} />
            {timeline.map((step, i) => (
              <div key={step.step} style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', margin: '0 auto 8px',
                  background: step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--color-neutral-200)',
                  border: `2px solid ${step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--color-neutral-300)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13,
                  boxShadow: step.active ? '0 0 0 4px rgba(29,78,216,0.2)' : 'none',
                }}>
                  {step.done ? <Check size={14} /> : step.active ? <Clock size={14} /> : i + 1}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: step.done || step.active ? 'var(--color-neutral-900)' : 'var(--color-neutral-400)' }}>{step.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {timeline.filter(s => s.done || s.active).map(step => (
              <div key={step.step} style={{
                display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 10,
                background: step.done ? 'var(--color-success-light)' : 'var(--color-primary-light)',
                border: `1px solid ${step.done ? 'var(--color-success)' : 'var(--color-primary)'}22`,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', color: step.done ? 'var(--color-success)' : 'var(--color-primary)' }}>{step.done ? <CheckCircle2 size={18} /> : <Hourglass size={18} />}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{step.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 2 }}>{step.desc}</p>
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
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>DOMAIN</p>
              <p style={{ fontSize: 14 }}>{emoji} {domain.primary_domain || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>ISSUE TYPE</p>
              <p style={{ fontSize: 14 }}>{formatSlug(domain.issue_type || domain.sub_domain) || 'N/A'}</p>
            </div>
            {domain.assigned_department && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>ASSIGNED DEPT</p>
                <p style={{ fontSize: 14 }}>{domain.assigned_department}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>UPVOTES</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)' }}>👍 {meta.upvotes || 0}</p>
            </div>
            {meta.resolved_at && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-600)', marginBottom: 4 }}>RESOLVED AT</p>
                <p style={{ fontSize: 14 }}>{formatDateTime(meta.resolved_at)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={20} /> Location</h3></div>
          {hasCoords ? (
            <MapComponent complaints={[complaint]} height={200} center={[lat, lon]} zoom={14} />
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-neutral-400)', fontSize: 13 }}>No location data</div>
          )}
          <div style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{wardText}</p>
          </div>
        </div>
      </div>

      {/* Resolution note */}
      {meta.resolution_text && (
        <div className="card">
          <div className="card-header"><h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MessageSquare size={20} /> Resolution Note</h3></div>
          <div className="card-body">
            <div style={{ background: 'var(--color-success-light)', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--color-success)', border: '1px solid var(--color-success)22' }}>
              ✅ {meta.resolution_text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
