const incidentModel = require('../models/incidentModel');
const { INCIDENT_STATUSES, INCIDENT_TYPES, INCIDENT_PRIORITIES } = require('../config/constants');

const incidentController = {
  async list(req, res) {
    try {
      const { page, limit, status, type, priority, assigned_to, search, sort_by, sort_order } = req.query;
      const result = await incidentModel.getAll({
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 25, 200),
        status,
        type,
        priority,
        assigned_to,
        search,
        sort_by,
        sort_order,
        userId: req.user.id,
        userRole: req.user.role,
      });
      res.json(result);
    } catch (err) {
      console.error('List incidents error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const incident = await incidentModel.getById(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      // provider can only view their own
      if (req.user.role === 'provider' && incident.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      res.json(incident);
    } catch (err) {
      console.error('Get incident error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req, res) {
    try {
      const { title, type, status, priority, description, body, notes, assigned_to, asset_ids } = req.body;

      if (!title || !type) {
        return res.status(400).json({ error: 'title and type are required' });
      }
      if (!INCIDENT_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${INCIDENT_TYPES.join(', ')}` });
      }
      if (status && !INCIDENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${INCIDENT_STATUSES.join(', ')}` });
      }
      if (priority && !INCIDENT_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${INCIDENT_PRIORITIES.join(', ')}` });
      }

      const incident = await incidentModel.create({
        title,
        type,
        status,
        priority,
        description,
        body,
        notes,
        assigned_to: assigned_to || null,
        created_by: req.user.id,
        asset_ids: Array.isArray(asset_ids) ? asset_ids : [],
      });

      res.status(201).json(incident);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Incident number already exists' });
      }
      console.error('Create incident error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req, res) {
    try {
      const existing = await incidentModel.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      // provider can only update incidents assigned to them
      if (req.user.role === 'provider' && existing.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { title, type, status, priority, description, body, notes, assigned_to, asset_ids } = req.body;

      if (type && !INCIDENT_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${INCIDENT_TYPES.join(', ')}` });
      }
      if (status && !INCIDENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${INCIDENT_STATUSES.join(', ')}` });
      }
      if (priority && !INCIDENT_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${INCIDENT_PRIORITIES.join(', ')}` });
      }

      const updated = await incidentModel.update(req.params.id, {
        title,
        type,
        status,
        priority,
        description,
        body,
        notes,
        assigned_to: assigned_to !== undefined ? (assigned_to || null) : undefined,
        asset_ids: Array.isArray(asset_ids) ? asset_ids : undefined,
      });

      res.json(updated);
    } catch (err) {
      console.error('Update incident error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete(req, res) {
    try {
      const result = await incidentModel.delete(req.params.id);
      if (result.error === 'not_found') {
        return res.status(404).json({ error: 'Incident not found' });
      }
      if (result.error === 'not_closed') {
        return res.status(400).json({ error: 'Only closed incidents can be deleted' });
      }
      res.json({ message: 'Incident deleted successfully' });
    } catch (err) {
      console.error('Delete incident error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getByAsset(req, res) {
    try {
      const incidents = await incidentModel.getByAssetId(req.params.assetId);
      res.json(incidents);
    } catch (err) {
      console.error('Get incidents by asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = incidentController;
