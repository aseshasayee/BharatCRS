import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
// Note: Chart data is now derived from real API stats (department_metrics from statsService)
import { statsService } from '../../services/statsService';
import { complaintService } from '../../services/complaintService';
import { MetricCard, StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { useApp } from '../../context/AppContext';
import { Clock, AlertTriangle, ClipboardList, CheckCircle2, BarChart2 } from 'lucide-react';
import { CHART_DEPT_SLA } from '../../data/mockData';

export default function DeptDashboard() {
  const { addToast, user } = useApp();
  const [stats, setStats] = useState({
    assigned: 0,
    completedToday: 0,
    slaCompliant: 0,
    overdue: 0
  });
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, complaintsData] = await Promise.all([
           statsService.getStats(),
           complaintService.listComplaints({ limit: 10, department: user?.department })
        ]);
        
        let deptMetrics = null;
        if(statsData.department_metrics && statsData.department_metrics.length > 0) {
            deptMetrics = statsData.department_metrics.find(d => d.department_id === user?.department) || statsData.department_metrics[0];
        }

        setStats({
          assigned: deptMetrics ? deptMetrics.total_complaints : 0,
          completedToday: deptMetrics ? deptMetrics.resolved_on_time : 0, // Mocking
          slaCompliant: deptMetrics ? Math.round(deptMetrics.sla_compliance_rate * 100) : 0,
          overdue: statsData.sla_breached || 0
        });

        const filtered = (complaintsData || []).filter(c => c.common_metadata?.status?.toLowerCase() !== 'resolved').slice(0, 3);
        setUpcoming(filtered);
      } catch (err) {
        console.error('Failed to load department data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.department]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={<ClipboardList size={24} color="var(--color-primary)" />} label="Assigned Issues" value={stats.assigned} iconBg="var(--color-primary-light)" />
        <MetricCard icon={<CheckCircle2 size={24} color="var(--color-success)" />} label="Resolved On Time" value={stats.completedToday} iconBg="var(--color-success-light)" />
        <MetricCard icon={<BarChart2 size={24} color="var(--color-warning)" />} label="SLA Compliant" value={`${stats.slaCompliant}%`} iconBg="var(--color-warning-light)" />
        <MetricCard icon={<AlertTriangle size={24} color="var(--color-danger)" />} label="Overdue / Breached" value={stats.overdue} deltaDir="down" iconBg="var(--color-danger-light)" />
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
          {upcoming.map((c, i) => {
            const id = c.common_metadata?.report_id;
            const status = c.common_metadata?.status?.toLowerCase() || 'submitted';
            const priority = c.priority_assessment?.priority_class?.toLowerCase() || 'low';
            const title = c.normalized_input?.issue_summary || c.normalized_input?.raw_text || 'No description provided';

            const slaHours = c.governance_and_sla?.sla_hours || 48;
            const t = new Date(c.common_metadata?.submission_timestamp);
            t.setHours(t.getHours() + slaHours);

            return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < upcoming.length - 1 ? '1px solid var(--color-neutral-100)' : 'none',
              borderLeft: priority === 'high' || priority === 'critical' ? '3px solid var(--color-danger)' : '3px solid transparent',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)', fontWeight: 700 }}>{id}</span>
                  <PriorityBadge priority={priority} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>
                  <AlertTriangle size={11} color="var(--color-warning)" style={{ marginRight: 4 }} />
                  SLA: {t.toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <StatusBadge status={status} />
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
