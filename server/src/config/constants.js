const ASSET_TYPES = ['PC', 'Laptop', 'Server', 'Mobile', 'Token', 'Other'];

const ASSET_STATUSES = [
  'Available',
  'Assigned',
  'In Maintenance',
  'Decommissioned',
  'Returned to Client',
];

// All statuses can transition to any other status
const STATUS_TRANSITIONS = {
  'Available': ['Assigned', 'In Maintenance', 'Decommissioned', 'Returned to Client'],
  'Assigned': ['Available', 'In Maintenance', 'Decommissioned', 'Returned to Client'],
  'In Maintenance': ['Available', 'Assigned', 'Decommissioned', 'Returned to Client'],
  'Decommissioned': ['Available', 'Assigned', 'In Maintenance', 'Returned to Client'],
  'Returned to Client': ['Available', 'Assigned', 'In Maintenance', 'Decommissioned'],
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
