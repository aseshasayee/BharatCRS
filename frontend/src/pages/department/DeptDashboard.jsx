import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { COMPLAINTS, DEPT_METRICS, CHART_DEPT_SLA, formatDateTime } from '../../data/mockData';
import { MetricCard, StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { Clock, AlertTriangle, ClipboardList, CheckCircle2, BarChart2 } from 'lucide-react';

export default function DeptDashboard() {
  const { addToast } = useApp();
  const deptComplaints = COMPLAINTS.filter(c => c.assignedTo === 'pwd');
  const upcoming = deptComplaints.filter(c => c.status !== 'resolved').slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={<ClipboardList size={24} color="var(--color-primary)" />} label="Assigned Issues" value={DEPT_METRICS.assigned} iconBg="var(--color-primary-light)" />
        <MetricCard icon={<CheckCircle2 size={24} color="var(--color-success)" />} label="Completed Today" value={DEPT_METRICS.completedToday} iconBg="var(--color-success-light)" />
        <MetricCard icon={<BarChart2 size={24} color="var(--color-warning)" />} label="SLA Compliant" value={`${DEPT_METRICS.slaCompliant}%`} iconBg="var(--color-warning-light)" />
        <MetricCard icon={<AlertTriangle size={24} color="var(--color-danger)" />} label="Overdue" value={DEPT_METRICS.overdue} deltaDir="down" iconBg="var(--color-danger-light)" />
      </div>

      {/* SLA chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BarChart2 size={20} /> SLA Performance (Last 4 Weeks)</h3>
        </div>
        <div style={{ padding: '12px 24px 20px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DEPT_SLA} barSize={18}>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="compliant" name="Compliant" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="atRisk" name="At Risk" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="breached" name="Breached" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--color-warning)" /> Upcoming SLA Deadlines
          </h3>
          <span className="badge badge-assigned">Next 24hrs</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {upcoming.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < upcoming.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
              borderLeft: c.priority === 'high' ? '3px solid var(--color-danger)' : '3px solid transparent',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)', fontWeight: 700 }}>{c.id}</span>
                  <PriorityBadge priority={c.priority} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>
                  <AlertTriangle size={11} color="var(--color-warning)" style={{ marginRight: 4 }} />
                  SLA: {formatDateTime(c.slaDeadline)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <StatusBadge status={c.status} />
                <button className="btn btn-primary btn-sm" onClick={() => addToast(`Status updated for ${c.id}`, 'success')}>
                  Update Status
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
