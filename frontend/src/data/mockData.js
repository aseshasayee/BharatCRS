// Mock data for BharatCRS platform

export const CATEGORIES = [
  { id: 'road', label: 'Road Damage', color: '#D97706' },
  { id: 'water', label: 'Water Supply', color: '#1D4ED8' },
  { id: 'electricity', label: 'Electricity', color: '#F59E0B' },
  { id: 'sanitation', label: 'Sanitation', color: '#16A34A' },
  { id: 'sewage', label: 'Sewage', color: '#7C3AED' },
  { id: 'parks', label: 'Parks & Trees', color: '#059669' },
  { id: 'streetlight', label: 'Street Lights', color: '#D97706' },
  { id: 'encroachment', label: 'Encroachment', color: '#DC2626' },
];

export const DEPARTMENTS = [
  { id: 'pwd', name: 'Public Works Dept.', short: 'PWD' },
  { id: 'water', name: 'Water Supply Board', short: 'WSB' },
  { id: 'electricity', name: 'Electricity Board', short: 'BESCOM' },
  { id: 'sanitation', name: 'Sanitation Dept.', short: 'BBMP' },
  { id: 'horticulture', name: 'Horticulture Dept.', short: 'HORT' },
];

export const WARDS = [
  'Ward 1 - Koramangala', 'Ward 2 - Indiranagar', 'Ward 3 - Whitefield',
  'Ward 4 - Jayanagar', 'Ward 5 - Rajajinagar', 'Ward 6 - Hebbal',
  'Ward 7 - Marathahalli', 'Ward 8 - BTM Layout', 'Ward 9 - Banashankari',
  'Ward 10 - Yelahanka', 'Ward 11 - Electronic City', 'Ward 12 - HSR Layout',
];

export const COMPLAINTS = [
  {
    id: 'BHR-2024-001', category: 'road', priority: 'high',
    status: 'inprogress', title: 'Large pothole on 80 Feet Road',
    description: 'A massive pothole near the main junction causing accidents daily. Multiple vehicles have been damaged.',
    location: 'Ward 1 - Koramangala, 80 Feet Road', ward: 'Ward 1 - Koramangala',
    lat: 12.9352, lng: 77.6245,
    submittedAt: '2024-01-15T09:23:00', updatedAt: '2024-01-17T14:30:00',
    assignedTo: 'pwd', assignedDept: 'Public Works Dept.',
    slaDeadline: '2024-01-20T09:23:00', upvotes: 47,
    citizenId: 'citizen-1', citizenName: 'Priya Sharma',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-15T09:23:00', desc: 'Complaint registered successfully', done: true },
      { step: 'verified', label: 'Verified', time: '2024-01-15T11:00:00', desc: 'Issue verified by admin', done: true },
      { step: 'assigned', label: 'Assigned', time: '2024-01-16T10:00:00', desc: 'Assigned to Public Works Dept.', done: true },
      { step: 'inprogress', label: 'In Progress', time: '2024-01-17T14:30:00', desc: 'Team dispatched to site', done: true },
      { step: 'resolved', label: 'Resolved', time: null, desc: 'Pending resolution', done: false },
    ]
  },
  {
    id: 'BHR-2024-002', category: 'water', priority: 'high',
    status: 'assigned', title: 'No water supply for 3 days',
    description: 'Entire street has no pipeline water for 3 consecutive days. Residents struggling.',
    location: 'Ward 2 - Indiranagar, 12th Main', ward: 'Ward 2 - Indiranagar',
    lat: 12.9784, lng: 77.6408,
    submittedAt: '2024-01-16T08:00:00', updatedAt: '2024-01-17T09:00:00',
    assignedTo: 'water', assignedDept: 'Water Supply Board',
    slaDeadline: '2024-01-19T08:00:00', upvotes: 31,
    citizenId: 'citizen-2', citizenName: 'Rajesh Kumar',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-16T08:00:00', desc: 'Complaint registered', done: true },
      { step: 'verified', label: 'Verified', time: '2024-01-16T10:00:00', desc: 'Verified by admin', done: true },
      { step: 'assigned', label: 'Assigned', time: '2024-01-17T09:00:00', desc: 'Assigned to Water Supply Board', done: true },
      { step: 'inprogress', label: 'In Progress', time: null, desc: 'Awaiting work start', done: false },
      { step: 'resolved', label: 'Resolved', time: null, desc: 'Pending', done: false },
    ]
  },
  {
    id: 'BHR-2024-003', category: 'streetlight', priority: 'medium',
    status: 'submitted', title: 'Street lights not working',
    description: '6 consecutive street lights have been non-functional for 2 weeks. Area is dark at night.',
    location: 'Ward 3 - Whitefield, ITPL Road', ward: 'Ward 3 - Whitefield',
    lat: 12.9698, lng: 77.7499,
    submittedAt: '2024-01-17T20:15:00', updatedAt: '2024-01-17T20:15:00',
    assignedTo: null, assignedDept: null,
    slaDeadline: '2024-01-24T20:15:00', upvotes: 12,
    citizenId: 'citizen-1', citizenName: 'Priya Sharma',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-17T20:15:00', desc: 'Complaint registered', done: true },
      { step: 'verified', label: 'Verified', time: null, desc: 'Under review', done: false },
      { step: 'assigned', label: 'Assigned', time: null, desc: 'Pending', done: false },
      { step: 'inprogress', label: 'In Progress', time: null, desc: 'Pending', done: false },
      { step: 'resolved', label: 'Resolved', time: null, desc: 'Pending', done: false },
    ]
  },
  {
    id: 'BHR-2024-004', category: 'sanitation', priority: 'high',
    status: 'escalated', title: 'Garbage not collected for a week',
    description: 'Waste accumulating on the street. Health hazard for residents. Multiple complaints ignored.',
    location: 'Ward 4 - Jayanagar, 9th Block', ward: 'Ward 4 - Jayanagar',
    lat: 12.9250, lng: 77.5938,
    submittedAt: '2024-01-10T07:00:00', updatedAt: '2024-01-17T12:00:00',
    assignedTo: 'sanitation', assignedDept: 'Sanitation Dept.',
    slaDeadline: '2024-01-13T07:00:00', upvotes: 89,
    citizenId: 'citizen-3', citizenName: 'Anitha Rao',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-10T07:00:00', desc: 'Complaint registered', done: true },
      { step: 'verified', label: 'Verified', time: '2024-01-10T09:00:00', desc: 'Verified by admin', done: true },
      { step: 'assigned', label: 'Assigned', time: '2024-01-11T10:00:00', desc: 'Assigned to BBMP', done: true },
      { step: 'inprogress', label: 'In Progress', time: '2024-01-12T11:00:00', desc: 'Team notified', done: true },
      { step: 'resolved', label: 'Resolved', time: null, desc: 'SLA Breached — Escalated', done: false },
    ]
  },
  {
    id: 'BHR-2024-005', category: 'road', priority: 'low',
    status: 'resolved', title: 'Cracked footpath near school',
    description: 'Footpath tiles cracked and raised, causing safety hazard for school children.',
    location: 'Ward 5 - Rajajinagar, 3rd Block', ward: 'Ward 5 - Rajajinagar',
    lat: 12.9954, lng: 77.5513,
    submittedAt: '2024-01-05T10:00:00', updatedAt: '2024-01-14T16:00:00',
    assignedTo: 'pwd', assignedDept: 'Public Works Dept.',
    slaDeadline: '2024-01-19T10:00:00', upvotes: 5,
    citizenId: 'citizen-1', citizenName: 'Priya Sharma',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-05T10:00:00', desc: 'Complaint registered', done: true },
      { step: 'verified', label: 'Verified', time: '2024-01-06T09:00:00', desc: 'Verified', done: true },
      { step: 'assigned', label: 'Assigned', time: '2024-01-07T10:00:00', desc: 'Assigned to PWD', done: true },
      { step: 'inprogress', label: 'In Progress', time: '2024-01-10T08:00:00', desc: 'Repair work started', done: true },
      { step: 'resolved', label: 'Resolved', time: '2024-01-14T16:00:00', desc: 'Repair completed and verified', done: true },
    ]
  },
  {
    id: 'BHR-2024-006', category: 'electricity', priority: 'medium',
    status: 'verified', title: 'Power outage affecting 50 homes',
    description: 'Transformer fault causing power cuts daily between 2–6 PM for the past week.',
    location: 'Ward 6 - Hebbal, Lake Road', ward: 'Ward 6 - Hebbal',
    lat: 13.0358, lng: 77.5970,
    submittedAt: '2024-01-16T15:00:00', updatedAt: '2024-01-17T10:00:00',
    assignedTo: null, assignedDept: null,
    slaDeadline: '2024-01-23T15:00:00', upvotes: 22,
    citizenId: 'citizen-4', citizenName: 'Mohammed Siddiqui',
    timeline: [
      { step: 'submitted', label: 'Submitted', time: '2024-01-16T15:00:00', desc: 'Complaint registered', done: true },
      { step: 'verified', label: 'Verified', time: '2024-01-17T10:00:00', desc: 'Verified by admin', done: true },
      { step: 'assigned', label: 'Assigned', time: null, desc: 'Pending assignment', done: false },
      { step: 'inprogress', label: 'In Progress', time: null, desc: 'Pending', done: false },
      { step: 'resolved', label: 'Resolved', time: null, desc: 'Pending', done: false },
    ]
  },
];

export const ADMIN_METRICS = {
  total: 1284,
  pending: 387,
  resolved: 841,
  avgResolutionTime: '4.2 days',
  totalDelta: +12,
  pendingDelta: -5,
  resolvedDelta: +18,
};

export const DEPT_METRICS = {
  assigned: 47,
  completedToday: 8,
  slaCompliant: 78,
  overdue: 5,
};

export const CHART_COMPLAINTS_OVER_TIME = [
  { date: 'Jan 11', complaints: 45 },{ date: 'Jan 12', complaints: 62 },
  { date: 'Jan 13', complaints: 38 },{ date: 'Jan 14', complaints: 71 },
  { date: 'Jan 15', complaints: 55 },{ date: 'Jan 16', complaints: 84 },
  { date: 'Jan 17', complaints: 67 },
];

export const CHART_CATEGORY = [
  { name: 'Road', value: 380, fill: '#D97706' },
  { name: 'Water', value: 220, fill: '#1D4ED8' },
  { name: 'Electricity', value: 195, fill: '#F59E0B' },
  { name: 'Sanitation', value: 270, fill: '#16A34A' },
  { name: 'Sewage', value: 140, fill: '#7C3AED' },
  { name: 'Others', value: 79, fill: '#6B7280' },
];

export const CHART_DEPT_PERFORMANCE = [
  { dept: 'PWD', avgTime: 5.2, issues: 380 },
  { dept: 'WSB', avgTime: 3.8, issues: 220 },
  { dept: 'BESCOM', avgTime: 2.1, issues: 195 },
  { dept: 'BBMP', avgTime: 6.7, issues: 270 },
  { dept: 'HORT', avgTime: 4.5, issues: 140 },
];

export const CHART_RESOLUTION_EFFICIENCY = [
  { week: 'Week 1', efficiency: 72 },{ week: 'Week 2', efficiency: 78 },
  { week: 'Week 3', efficiency: 74 },{ week: 'Week 4', efficiency: 83 },
];

export const CHART_SLA = [
  { name: 'Compliant', value: 78, fill: '#16A34A' },
  { name: 'At Risk', value: 14, fill: '#D97706' },
  { name: 'Breached', value: 8, fill: '#DC2626' },
];

export const CHART_DEPT_SLA = [
  { week: 'Week 1', compliant: 32, atRisk: 8, breached: 3 },
  { week: 'Week 2', compliant: 28, atRisk: 10, breached: 5 },
  { week: 'Week 3', compliant: 35, atRisk: 7, breached: 2 },
  { week: 'Week 4', compliant: 38, atRisk: 6, breached: 3 },
];

export const PREDICTIONS = [
  { rank: 1, ward: 'Ward 7 - Marathahalli', volume: 47, category: 'Road Damage', confidence: 87 },
  { rank: 2, ward: 'Ward 12 - HSR Layout', volume: 38, category: 'Water Supply', confidence: 81 },
  { rank: 3, ward: 'Ward 3 - Whitefield', volume: 32, category: 'Electricity', confidence: 76 },
  { rank: 4, ward: 'Ward 1 - Koramangala', volume: 29, category: 'Sanitation', confidence: 72 },
  { rank: 5, ward: 'Ward 4 - Jayanagar', volume: 24, category: 'Road Damage', confidence: 68 },
];

export const NOTIFICATIONS = [
  { id: 1, message: 'BHR-2024-001 has been assigned to PWD', time: '5m ago', read: false, type: 'info' },
  { id: 2, message: 'BHR-2024-004 SLA breached — Escalated', time: '1h ago', read: false, type: 'danger' },
  { id: 3, message: 'BHR-2024-005 resolved successfully', time: '3h ago', read: true, type: 'success' },
  { id: 4, message: 'New complaint in Ward 7 requires attention', time: '5h ago', read: true, type: 'warning' },
  { id: 5, message: 'System maintenance scheduled for Sunday midnight', time: '1d ago', read: true, type: 'info' },
];

export const CITIZEN_STATS = {
  total: 3,
  resolved: 1,
  inProgress: 1,
};

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || { label: id, color: '#6B7280' };
}

export function getDepartmentById(id) {
  return DEPARTMENTS.find(d => d.id === id) || { name: id, short: id };
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
