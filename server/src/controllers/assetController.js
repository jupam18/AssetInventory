const assetModel = require('../models/assetModel');
const auditModel = require('../models/auditModel');
const settingsModel = require('../models/settingsModel');
const { ASSET_STATUSES, STATUS_TRANSITIONS } = require('../config/constants');

const assetController = {
  async list(req, res) {
    try {
      const { page, limit, status, asset_type, location, search, sort_by, sort_order } = req.query;
      const result = await assetModel.findAll({
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 50, 200),
        status,
        asset_type,
        location,
        search,
        sort_by,
        sort_order,
      });
      res.json(result);
    } catch (err) {
      console.error('List assets error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const asset = await assetModel.findById(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      res.json(asset);
    } catch (err) {
      console.error('Get asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req, res) {
    try {
      const { serial_number, asset_type, make, model, location, client, assigned_to, status, warranty_date, commentary } = req.body;

      if (!serial_number || !asset_type) {
        return res.status(400).json({ error: 'serial_number and asset_type are required' });
      }
      if (status && !ASSET_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${ASSET_STATUSES.join(', ')}` });
      }

      const asset = await assetModel.create({
        serial_number, asset_type, make, model, location, client, assigned_to,
        status: status || 'Available', warranty_date, commentary,
      });

      await auditModel.create({
        asset_id: asset.id,
        serial_number: asset.serial_number,
        action: 'CREATED',
        new_value: JSON.stringify({ asset_type, status: asset.status, location, client, assigned_to }),
        performed_by: req.user.full_name,
        comment: commentary || 'Asset created',
      });

      res.status(201).json(asset);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Serial number already exists' });
      }
      console.error('Create asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req, res) {
    try {
      const existing = await assetModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const { serial_number, asset_type, make, model, location, client, assigned_to, status, warranty_date, commentary } = req.body;

      if (status && !ASSET_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status` });
      }

      // Validate status transition
      if (status && status !== existing.status) {
        const allowed = STATUS_TRANSITIONS[existing.status];
        if (!allowed || !allowed.includes(status)) {
          return res.status(400).json({
            error: `Cannot transition from "${existing.status}" to "${status}". Allowed: ${(allowed || []).join(', ') || 'none'}`,
          });
        }
      }

      const fields = {};
      const auditEntries = [];

      const trackedFields = { serial_number, asset_type, make, model, location, client, assigned_to, status, warranty_date, commentary };
      for (const [key, value] of Object.entries(trackedFields)) {
        if (value !== undefined) {
          const oldVal = existing[key];
          const newVal = value;
          if (String(oldVal ?? '') !== String(newVal ?? '')) {
            fields[key] = value === '' ? null : value;
            auditEntries.push({
              asset_id: existing.id,
              serial_number: existing.serial_number,
              action: key === 'status' ? 'STATUS_CHANGE' : key === 'assigned_to' ? 'ASSIGNMENT_CHANGE' : key === 'location' ? 'LOCATION_CHANGE' : key === 'client' ? 'CLIENT_CHANGE' : 'FIELD_UPDATE',
              field_changed: key,
              old_value: String(oldVal ?? ''),
              new_value: String(newVal ?? ''),
              performed_by: req.user.full_name,
              comment: req.body.audit_comment || null,
            });
          }
        }
      }

      if (Object.keys(fields).length === 0) {
        return res.json(existing);
      }

      const updated = await assetModel.update(req.params.id, fields);
      if (auditEntries.length > 0) {
        await auditModel.createMany(auditEntries);
      }

      res.json(updated);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Serial number already exists' });
      }
      console.error('Update asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete(req, res) {
    try {
      const existing = await assetModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      await auditModel.create({
        asset_id: existing.id,
        serial_number: existing.serial_number,
        action: 'DELETED',
        old_value: JSON.stringify(existing),
        performed_by: req.user.full_name,
        comment: req.body.audit_comment || 'Asset deleted',
      });

      await assetModel.delete(req.params.id);
      res.json({ message: 'Asset deleted successfully' });
    } catch (err) {
      console.error('Delete asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getDashboard(req, res) {
    try {
      const [stats, warrantyAlerts] = await Promise.all([
        assetModel.getDashboardStats(),
        assetModel.getWarrantyAlerts(30),
      ]);
      res.json({ ...stats, warrantyAlerts });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = assetController;
