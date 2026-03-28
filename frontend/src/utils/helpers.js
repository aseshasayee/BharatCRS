/** Shared date/time utilities — replaces the formatDate/timeAgo from mockData */

export function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return isoString; }
}

export function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoString; }
}

export function timeAgo(isoString) {
  if (!isoString) return 'Unknown';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(isoString);
  } catch { return 'Unknown'; }
}

/** Domain → emoji mapping */
import { HardHat, Leaf, TrafficCone, Hospital, AlertTriangle, Building2 } from 'lucide-react';

/** Domain → icon mapping */
export const DOMAIN_ICONS = {
  'Core Infrastructure & Public Works': HardHat,
  'Sanitation, Environment & Parks': Leaf,
  'Transportation & Traffic': TrafficCone,
  'Social Infrastructure & Public Health': Hospital,
  'Emergency, Safety & Accountability': AlertTriangle,
  'Urban Planning & Real Estate': Building2,
};

/** Well-known Chennai wards */
export const CHENNAI_WARDS = [
  'Thiruvottiyur', 'Manali', 'Madhavaram', 'Tondiarpet', 'Royapuram',
  'Harbour', 'Basin Bridge', 'Park Town', 'Flower Bazaar', 'Anna Nagar',
  'T. Nagar', 'Adyar', 'Sholinganallur', 'Alandur', 'Ambattur',
  'Ayanavaram', 'Perambur', 'Villivakkam', 'Kodambakkam',
  'Valasaravakkam', 'Manappakkam',
];

/** Known departments */
export const DEPARTMENTS = [
  'GCC Roads Department', 'CMWSSB', 'GCC Electrical', 'GCC Sanitation',
  'Public Health Department', 'GCC Parks', 'Traffic Police', 'MTC/CMRL',
  'CMDA', 'Child Welfare & Health Unit', 'Health Department',
  'Education Department', 'Fire & Safety Department',
  'Disaster Management', 'Vigilance Department',
];

/** Helper: extract mapped fields from the backend complaint document */
export function mapComplaint(c) {
  return {
    id: c.common_metadata?.report_id || c._id,
    status: c.common_metadata?.status || 'submitted',
    priority: c.priority_assessment?.priority_class || 'Low',
    title: c.common_metadata?.raw_text || '',
    description: c.common_metadata?.raw_text || '',
    domain: c.domain_classification?.primary_domain || '',
    subdomain: c.domain_classification?.sub_domain || '',
    issue_type: c.domain_classification?.issue_type || '',
    department: c.domain_classification?.assigned_department || '',
    ward: c.common_metadata?.location?.ward_name || c.context_analysis?.ward_name || '',
    ward_id: c.common_metadata?.location?.ward_id || '',
    lat: c.common_metadata?.location?.latitude,
    lon: c.common_metadata?.location?.longitude,
    upvotes: c.common_metadata?.upvotes || 0,
    submittedAt: c.common_metadata?.submission_timestamp,
    resolvedAt: c.common_metadata?.resolved_at,
    citizen_id: c.common_metadata?.citizen_id || '',
    sla_breached: c.governance_and_sla?.sla_breached || false,
  };
}
