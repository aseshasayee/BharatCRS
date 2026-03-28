import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { statsService } from '../../services/statsService';
import { Download, Clock, Package, TrendingUp, CheckCircle2, FolderOpen } from 'lucide-react';

const AVG_RESOLUTION = [
  { week: 'W1', days: 6.2 }, { week: 'W2', days: 5.8 }, { week: 'W3', days: 4.9 }, { week: 'W4', days: 4.2 },
];

const WORKLOAD = [
  { week: 'W1', issues: 42 }, { week: 'W2', issues: 38 }, { week: 'W3', issues: 55 }, { week: 'W4', issues: 47 },
];

const BACKLOG = [
  { day: 'Mon', open: 32 }, { day: 'Tue', open: 38 }, { day: 'Wed', open: 35 },
  { day: 'Thu', open: 42 }, { day: 'Fri', open: 37 }, { day: 'Sat', open: 29 }, { day: 'Sun', open: 27 },
];

const CATEGORY_RESOLUTION = [
  { category: 'Road', count: 18 }, { category: 'Water', count: 12 },
  { category: 'Electricity', count: 9 }, { category: 'Sanitation', count: 15 }, { category: 'Parks', count: 6 },
];

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <button className="btn btn-secondary btn-sm" style={{ gap: 4 }}><Download size={12} /> Export</button>
      </div>
      <div style={{ padding: '8px 16px 20px' }}>{children}</div>
    </div>
  );
}

export default function DeptAnalytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [slaData, setSlaData] = useState([
    { name: 'On Time', value: 72, fill: '#22c55e' },
    { name: 'SLA Breach', value: 28, fill: '#ef4444' },
  ]);

  useEffect(() => {
    statsService.getDepartmentMetrics?.().then(data => {
      if (!data?.length) return;
      const total = data.reduce((s, d) => s + (d.total_complaints || 0), 0);
      const onTime = data.reduce((s, d) => s + (d.resolved_on_time || 0), 0);
      if (total > 0) {
        const pct = Math.round((onTime / total) * 100);
        setSlaData([
          { name: 'On Time', value: pct, fill: '#22c55e' },
          { name: 'SLA Breach', value: 100 - pct, fill: '#ef4444' },
        ]);
      }
    }).catch(() => {});
  }, []);

  const CHART_SLA = slaData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Performance Analytics</h2>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Public Works Department · Chennai</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setDateRange(r)} className="btn btn-sm"
              style={{ background: dateRange === r ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: dateRange === r ? 'white' : 'var(--color-neutral-700)', padding: '6px 14px' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <ChartCard title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clock size={18} /> Avg Resolution Time (days)</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={AVG_RESOLUTION}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[3, 8]} />
              <Tooltip formatter={(v) => `${v} days`} />
              <Line type="monotone" dataKey="days" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Package size={18} /> Weekly Workload</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WORKLOAD} barSize={32}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="issues" fill="var(--color-primary)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><TrendingUp size={18} /> Backlog Trend (Open Issues)</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={BACKLOG}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="open" stroke="var(--color-danger)" fill="var(--color-danger-light)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={18} /> SLA Compliance</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={CHART_SLA} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={2}>
                {CHART_SLA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8 }}>
            {CHART_SLA.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.fill }} />
                {s.name}: <strong>{s.value}%</strong>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><FolderOpen size={18} /> Resolutions by Category</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CATEGORY_RESOLUTION} layout="vertical" barSize={18}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={75} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-success)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
