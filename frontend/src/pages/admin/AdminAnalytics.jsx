import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { statsService } from '../../services/statsService';
import { complaintService } from '../../services/complaintService';
import { Download, TrendingUp, Building, CheckCircle2, BookOpen, Map, Target } from 'lucide-react';

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <button className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
          <Download size={12} /> Export
        </button>
      </div>
      <div style={{ padding: '8px 16px 20px' }}>{children}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [deptPerf, setDeptPerf] = useState([]);
  const [slaData, setSlaData] = useState([{name:'On Time',value:72,fill:'#22c55e'},{name:'SLA Breach',value:28,fill:'#ef4444'}]);
  const [wardData, setWardData] = useState([]);
  const [priorityData, setPriorityData] = useState([{name:'Critical',value:0,fill:'#7c3aed'},{name:'High',value:0,fill:'#DC2626'},{name:'Medium',value:0,fill:'#D97706'},{name:'Low',value:0,fill:'#16A34A'}]);

  useEffect(() => {
    // Dept performance
    statsService.getDepartmentMetrics?.().then(data => {
      if (!data?.length) return;
      const total = data.reduce((s,d) => s+(d.total_complaints||0),0);
      const onTime = data.reduce((s,d) => s+(d.resolved_on_time||0),0);
      if (total>0) {
        const pct = Math.round((onTime/total)*100);
        setSlaData([{name:'On Time',value:pct,fill:'#22c55e'},{name:'SLA Breach',value:100-pct,fill:'#ef4444'}]);
      }
      setDeptPerf(data.slice(0,6).map(d=>({dept:d.department_id?.split(' ')[0]||d.department_id,avgTime:(d.avg_resolution_days||2).toFixed(1)*1})));
    }).catch(()=>{});
    // Ward data and priority from complaints
    complaintService.listComplaints({limit:200}).then(data => {
      const wardCounts = {};
      const pCounts = {Critical:0,High:0,Medium:0,Low:0};
      (data||[]).forEach(c=>{
        const w = c.spatio_temporal_core?.administrative_unit?.ward_id ? `Ward ${c.spatio_temporal_core.administrative_unit.ward_id}` : c.common_metadata?.location?.ward_name;
        if(w) wardCounts[w]=(wardCounts[w]||0)+1;
        const p = c.priority_assessment?.priority_class;
        if(p && pCounts[p]!==undefined) pCounts[p]++;
      });
      setWardData(Object.entries(wardCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([ward,issues])=>({ward:ward.substring(0,8),issues})));
      setPriorityData([{name:'Critical',value:pCounts.Critical,fill:'#7c3aed'},{name:'High',value:pCounts.High,fill:'#DC2626'},{name:'Medium',value:pCounts.Medium,fill:'#D97706'},{name:'Low',value:pCounts.Low,fill:'#16A34A'}]);
    }).catch(()=>{});
  },[]);

const CHART_SLA = slaData;
const WARD_DATA = wardData;

const CHART_RESOLUTION_EFFICIENCY = [
  { week: 'Week 1', efficiency: 75 },
  { week: 'Week 2', efficiency: 80 },
  { week: 'Week 3', efficiency: 85 },
  { week: 'Week 4', efficiency: 90 },
];

const STACKED = [
  { month: 'Nov', road: 120, water: 80, electricity: 60, sanitation: 90 },
  { month: 'Dec', road: 150, water: 95, electricity: 75, sanitation: 110 },
  { month: 'Jan', road: 180, water: 110, electricity: 85, sanitation: 130 },
];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Global filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>Analytics</h2>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Platform-wide performance insights</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className="btn btn-sm"
              style={{ background: dateRange === r ? 'var(--color-primary)' : 'var(--color-neutral-100)', color: dateRange === r ? 'white' : 'var(--color-neutral-700)', padding: '6px 14px' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid-2">
        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={18} /> Resolution Efficiency (%)</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={CHART_RESOLUTION_EFFICIENCY}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="efficiency" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building size={18} /> Department Performance (avg days)</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptPerf} barSize={28}>
              <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avgTime" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={18} /> SLA Compliance Rate</span>}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={CHART_SLA} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {CHART_SLA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {CHART_SLA.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.fill }} />
                <span>{s.name}: <strong>{s.value}%</strong></span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={18} /> Complaints by Category Over Time</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={STACKED}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="road" stackId="1" stroke="#D97706" fill="#FEF3C7" />
              <Area type="monotone" dataKey="water" stackId="1" stroke="#1D4ED8" fill="#DBEAFE" />
              <Area type="monotone" dataKey="electricity" stackId="1" stroke="#F59E0B" fill="#FEF9C3" />
              <Area type="monotone" dataKey="sanitation" stackId="1" stroke="#16A34A" fill="#DCFCE7" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Map size={18} /> Ward-level Issue Count</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WARD_DATA} barSize={20} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="ward" tick={{ fontSize: 11 }} width={35} />
              <Tooltip />
              <Bar dataKey="issues" fill="var(--color-warning)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={18} /> Priority Breakdown</span>}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityData}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
