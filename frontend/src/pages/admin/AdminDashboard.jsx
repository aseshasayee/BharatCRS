import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePolling } from '../../utils/usePolling';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { timeAgo, formatDate } from '../../utils/helpers';
import { statsService } from '../../services/statsService';
import { complaintService } from '../../services/complaintService';
import { MetricCard, StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, ChevronRight, ClipboardList, Hourglass } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved: 0,
    sla_breached: 0,
    pending: 0,
    avgResolutionTime: '0 days',
    department_metrics: []
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live polling: refreshes every 15 seconds without page reload
  usePolling(async () => {
    const statsData = await statsService.getStats();
    let totalAvg = 0;
    if (statsData.department_metrics && statsData.department_metrics.length > 0) {
      totalAvg = statsData.department_metrics.reduce((acc, d) => acc + (d.avg_resolution_days || 0), 0) / statsData.department_metrics.length;
    }
    return {
      total_complaints: statsData.total_complaints || 0,
      resolved: statsData.resolved || 0,
      sla_breached: statsData.sla_breached || 0,
      pending: (statsData.total_complaints || 0) - (statsData.resolved || 0),
      avgResolutionTime: totalAvg > 0 ? `${totalAvg.toFixed(1)} days` : 'N/A',
      department_metrics: statsData.department_metrics || []
    };
  }, setStats, 15000);

  usePolling(async () => {
    const data = await complaintService.listComplaints({ limit: 10 });
    return data || [];
  }, setRecent, 15000);


  const [chartRange, setChartRange] = useState('30d');

  const chartDeptData = stats.department_metrics.map(d => ({
    dept: (d.department_id || 'Dept').split(' ')[0],
    avgTime: parseFloat(d.avg_resolution_days) || 0
  })).sort((a,b) => b.avgTime - a.avgTime).slice(0, 5);

  // Derive category pie data from recent complaints
  const PALETTE = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'];
  const domainCounts = {};
  recent.forEach(c => {
    const d = c.domain_classification?.primary_domain || 'Other';
    const short = d.split(' ')[0];
    domainCounts[short] = (domainCounts[short] || 0) + 1;
  });
  const chartCategory = Object.entries(domainCounts).map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length] }));

  // Simple complaints-over-time: bucket recent by day
  const dayMap = {};
  recent.forEach(c => {
    const d = c.common_metadata?.submission_timestamp;
    if (!d) return;
    const label = new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    dayMap[label] = (dayMap[label] || 0) + 1;
  });
  const chartOverTime = Object.entries(dayMap).map(([date, complaints]) => ({ date, complaints })).slice(-7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Metric cards */}
      <div className="grid-4">
        <MetricCard icon={<ClipboardList size={24} color="var(--color-primary)" />} label="Total Complaints" value={stats.total_complaints.toLocaleString()} delta={0} deltaDir="up" iconBg="var(--color-primary-light)" />
        <MetricCard icon={<Hourglass size={24} color="var(--color-warning)" />} label="Pending" value={stats.pending} delta={0} deltaDir="down" iconBg="var(--color-warning-light)" />
        <MetricCard icon={<CheckCircle2 size={24} color="var(--color-success)" />} label="Resolved" value={stats.resolved} delta={0} deltaDir="up" iconBg="var(--color-success-light)" />
        <MetricCard icon={<Clock size={24} color="var(--color-violet)" />} label="Avg Resolution" value={stats.avgResolutionTime} iconBg="var(--color-violet-light)" />
      </div>

      {/* Charts row */}
      <div className="grid-3">
        {/* Line chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">Complaints Over Time</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['7d', '30d', '90d'].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className="btn btn-sm"
                  style={{ background: chartRange === r ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: chartRange === r ? 'white' : 'var(--color-neutral-600)', padding: '4px 10px' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartOverTime.length > 0 ? chartOverTime : [{date:'Today', complaints: stats.total_complaints}]}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="complaints" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">By Category</h3></div>
          <div style={{ padding: '8px 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartCategory.length > 0 ? chartCategory : [{name:'No Data',value:1,fill:'#E5E7EB'}]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {(chartCategory.length > 0 ? chartCategory : [{fill:'#E5E7EB'}]).map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {chartCategory.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                    {d.name}
                  </div>
                  <span style={{ fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dept performance bar chart */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Department Performance — Avg Resolution Time (days)</h3></div>
        <div style={{ padding: '16px 24px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartDeptData.length > 0 ? chartDeptData : [{dept:'No Data', avgTime: 0}]} barSize={36}>
              <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avgTime" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/issues')}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Location</th><th>Time</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => {
                 const id = c.common_metadata?.report_id;
                 const status = c.common_metadata?.status?.toLowerCase() || 'submitted';
                 const priority = c.priority_assessment?.priority_class?.toLowerCase() || 'low';
                 const title = c.common_metadata?.raw_text || 'No description provided';
                 const category = c.domain_classification?.primary_domain || 'Unknown';
                 const ward = `Ward ${c.spatio_temporal_core?.administrative_unit?.ward_id || 'Unknown'}`;
                 const submittedAt = c.common_metadata?.submission_timestamp || new Date().toISOString();
                 return(
                <tr key={id} className={priority === 'high' || priority === 'critical' ? 'high-priority' : ''}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)' }}>{id}</span></td>
                  <td style={{ maxWidth: 200 }}><span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{title}</span></td>
                  <td style={{ fontSize: 13 }}>{category}</td>
                  <td><PriorityBadge priority={priority} /></td>
                  <td style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{ward}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{timeAgo(submittedAt)}</td>
                  <td><StatusBadge status={status} /></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
