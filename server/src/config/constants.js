const ASSET_TYPES = ['PC', 'Laptop', 'Server', 'Mobile', 'Token', 'Other'];

const ASSET_STATUSES = [
  'Available',
  'Assigned',
  'In Maintenance',
  'Decommissioned',
  'Returned to Client',
];

// Valid status transitions following ITIL lifecycle
const STATUS_TRANSITIONS = {
  'Available': ['Assigned', 'In Maintenance', 'Decommissioned'],
  'Assigned': ['Available', 'In Maintenance', 'Returned to Client'],
  'In Maintenance': ['Available', 'Decommissioned'],
  'Decommissioned': [],
  'Returned to Client': [],
};

const ROLES = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  AUDITOR: 'auditor',
};

const WARRANTY_ALERT_DAYS = 30;

module.exports = {
  ASSET_TYPES,
  ASSET_STATUSES,
  STATUS_TRANSITIONS,
  ROLES,
  WARRANTY_ALERT_DAYS,
};
