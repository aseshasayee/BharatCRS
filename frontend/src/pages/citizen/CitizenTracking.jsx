import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, timeAgo } from '../../utils/helpers';
import { complaintService } from '../../services/complaintService';
import { StatusBadge, PriorityBadge, CategoryChip, EmptyState } from '../../components/SharedComponents';
import { Search, ChevronRight, MapPin, Calendar } from 'lucide-react';

export default function CitizenTracking() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const data = await complaintService.listComplaints({ limit: 10 });
        setComplaints(data || []);
      } catch (err) {
        console.error('Failed to fetch tracking complaints:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const filtered = complaints.filter(c => {
    const status = c.common_metadata?.status || '';
    const reportId = c.common_metadata?.report_id || '';
    const desc = c.normalized_input?.raw_text || c.common_metadata?.raw_text || '';
    
    return (!statusFilter || status.toLowerCase() === statusFilter.toLowerCase()) &&
           (!search || desc.toLowerCase().includes(search.toLowerCase()) || reportId.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700 }}>My Complaints</h2>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: 14, marginTop: 4 }}>Track the status of all your submitted complaints.</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }} />
          <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by ID or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['Assigned','Human Review','Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-neutral-500)' }}>Loading complaints...</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No complaints found" desc="Try adjusting your filters or raise your first complaint." cta="Raise Complaint" onCta={() => navigate('/citizen/submit')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(c => {
            const id = c.common_metadata?.report_id;
            const status = c.common_metadata?.status?.toLowerCase() || 'submitted';
            const priority = c.priority_assessment?.priority_class?.toLowerCase() || 'low';
            const title = c.normalized_input?.raw_text || c.common_metadata?.raw_text || 'No description provided';
            const category = c.domain_classification?.primary_domain || 'Unknown';
            const ward = `Ward ${c.spatio_temporal_core?.administrative_unit?.ward_id || 'Unknown'}`;
            const submittedAt = c.common_metadata?.submission_timestamp || new Date().toISOString();
            
            return (
            <div
              key={id}
              onClick={() => navigate(`/citizen/tracking/${id}`)}
              className="card"
              style={{
                cursor: 'pointer', transition: 'all 0.15s',
                borderLeft: priority === 'high' || priority === 'critical' ? '4px solid var(--color-danger)' : priority === 'medium' ? '4px solid var(--color-warning)' : '4px solid var(--color-neutral-300)',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-low)'}
            >
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                     <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-600)', fontFamily: 'monospace' }}>{id}</span>
                     <StatusBadge status={status} />
                     <PriorityBadge priority={priority} />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                     <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}><CategoryChip category={category} /></span>
                     <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {ward}</span>
                     <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDate(submittedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--color-neutral-400)" />
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
