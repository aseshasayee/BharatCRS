import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ADMIN_METRICS, COMPLAINTS, CHART_COMPLAINTS_OVER_TIME,
  CHART_CATEGORY, CHART_DEPT_PERFORMANCE, formatDate, timeAgo,
} from '../../data/mockData';
import { MetricCard, StatusBadge, PriorityBadge } from '../../components/SharedComponents';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, ChevronRight, ClipboardList, Hourglass } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [chartRange, setChartRange] = useState('7d');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Metric cards */}
      <div className="grid-4">
        <MetricCard icon={<ClipboardList size={24} color="var(--color-primary)" />} label="Total Complaints" value={ADMIN_METRICS.total.toLocaleString()} delta={ADMIN_METRICS.totalDelta} deltaDir="up" iconBg="var(--color-primary-light)" />
        <MetricCard icon={<Hourglass size={24} color="var(--color-warning)" />} label="Pending" value={ADMIN_METRICS.pending} delta={Math.abs(ADMIN_METRICS.pendingDelta)} deltaDir="down" iconBg="var(--color-warning-light)" />
        <MetricCard icon={<CheckCircle2 size={24} color="var(--color-success)" />} label="Resolved" value={ADMIN_METRICS.resolved} delta={ADMIN_METRICS.resolvedDelta} deltaDir="up" iconBg="var(--color-success-light)" />
        <MetricCard icon={<Clock size={24} color="var(--color-violet)" />} label="Avg Resolution" value={ADMIN_METRICS.avgResolutionTime} iconBg="var(--color-violet-light)" />
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
              <LineChart data={CHART_COMPLAINTS_OVER_TIME}>
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
                <Pie data={CHART_CATEGORY} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {CHART_CATEGORY.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CHART_CATEGORY.map(d => (
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
            <BarChart data={CHART_DEPT_PERFORMANCE} barSize={36}>
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
              {COMPLAINTS.map(c => (
                <tr key={c.id} className={c.priority === 'high' ? 'high-priority' : ''}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)' }}>{c.id}</span></td>
                  <td style={{ maxWidth: 200 }}><span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.title}</span></td>
                  <td style={{ fontSize: 13 }}>{c.category}</td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{c.ward}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{timeAgo(c.submittedAt)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
