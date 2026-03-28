export const STATUS_BADGE_MAP = {
  'Available': 'badge-available',
  'Assigned': 'badge-assigned',
  'In Maintenance': 'badge-maintenance',
  'Decommissioned': 'badge-decommissioned',
  'Returned to Client': 'badge-returned',
};

export const CHART_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2',
  '#7c3aed', '#db2777', '#059669', '#ca8a04', '#6366f1',
];

export function statusBadge(status) {
  return STATUS_BADGE_MAP[status] || 'badge-available';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export const ASSET_TYPES = ['PC', 'Laptop', 'Server', 'Mobile', 'Token', 'Other'];
export const ASSET_STATUSES = ['Available', 'Assigned', 'In Maintenance', 'Decommissioned', 'Returned to Client'];

export const INCIDENT_STATUSES = ['Open', 'In Progress', 'Pending', 'Closed'];
export const INCIDENT_TYPES = ['Onboarding', 'Offboarding', 'Other'];
export const INCIDENT_PRIORITIES = ['Low', 'Medium', 'High'];

export function priorityBadge(priority) {
  const map = { 'Low': 'badge-priority-low', 'Medium': 'badge-priority-medium', 'High': 'badge-priority-high' };
  return map[priority] || 'badge-priority-low';
}

export function incidentStatusBadge(status) {
  const map = {
    'Open': 'badge-incident-open',
    'In Progress': 'badge-incident-inprogress',
    'Pending': 'badge-incident-pending',
    'Closed': 'badge-incident-closed',
  };
  return map[status] || 'badge-incident-open';
}

export function incidentTypeBadge(type) {
  const map = {
    'Onboarding': 'badge-incident-onboarding',
    'Offboarding': 'badge-incident-offboarding',
    'Other': 'badge-incident-other',
  };
  return map[type] || 'badge-incident-other';
}
