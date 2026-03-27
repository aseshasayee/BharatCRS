// Shared Badge components
import { CarFront, Droplets, Zap, Trash2, Trees, Lightbulb, Hammer, MapPin, Inbox, Box } from 'lucide-react';

export function StatusBadge({ status }) {
  const MAP = {
    submitted: { cls: 'badge-submitted', label: 'Submitted' },
    verified: { cls: 'badge-verified', label: 'Verified' },
    assigned: { cls: 'badge-assigned', label: 'Assigned' },
    inprogress: { cls: 'badge-inprogress', label: 'In Progress' },
    resolved: { cls: 'badge-resolved', label: 'Resolved' },
    escalated: { cls: 'badge-escalated', label: 'Escalated' },
  };
  const { cls, label } = MAP[status] || { cls: 'badge-submitted', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function PriorityBadge({ priority }) {
  const MAP = {
    high: { cls: 'badge-high', label: 'High' },
    medium: { cls: 'badge-medium', label: 'Medium' },
    low: { cls: 'badge-low', label: 'Low' },
  };
  const { cls, label } = MAP[priority] || { cls: 'badge-submitted', label: priority };
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function CategoryChip({ category }) {
  const icons = {
    road: <CarFront size={14} />, water: <Droplets size={14} />, electricity: <Zap size={14} />,
    sanitation: <Trash2 size={14} />, sewage: <Trash2 size={14} />, parks: <Trees size={14} />,
    streetlight: <Lightbulb size={14} />, encroachment: <Hammer size={14} />,
  };
  const labels = {
    road: 'Road', water: 'Water', electricity: 'Electricity', sanitation: 'Sanitation',
    sewage: 'Sewage', parks: 'Parks', streetlight: 'Street Lights', encroachment: 'Encroachment',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      {icons[category] || <MapPin size={14} />} {labels[category] || category}
    </span>
  );
}

export function MetricCard({ icon, label, value, delta, deltaDir, iconBg, iconColor }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ marginTop: 4 }}>{value}</div>
        </div>
        <div className="metric-icon" style={{ background: iconBg }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>
      </div>
      {delta !== undefined && (
        <div className={`metric-delta ${deltaDir}`}>
          <span>{deltaDir === 'up' ? '↑' : '↓'} {Math.abs(delta)}%</span>
          <span style={{ color: 'var(--color-neutral-600)', fontWeight: 400 }}>vs last period</span>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, desc, cta, onCta }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon || <Inbox size={32} />}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {cta && <button className="btn btn-primary" onClick={onCta}>{cta}</button>}
    </div>
  );
}

export function SkeletonCard({ height = 80 }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height, width: '100%' }} />
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--color-neutral-600)' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
