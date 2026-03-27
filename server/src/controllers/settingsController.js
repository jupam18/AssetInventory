const settingsModel = require('../models/settingsModel');

const settingsController = {
  async getAll(req, res) {
    try {
      const rows = await settingsModel.findAll();
      // Group by category
      const grouped = rows.reduce((acc, row) => {
        if (!acc[row.category]) acc[row.category] = [];
        acc[row.category].push(row);
        return acc;
      }, {});
      res.json(grouped);
    } catch (err) {
      console.error('Settings getAll error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getByCategory(req, res) {
    try {
      const { category } = req.params;
      if (!settingsModel.isValidCategory(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: asset_type, location, client` });
      }
      const rows = await settingsModel.findByCategory(category);
      res.json(rows);
    } catch (err) {
      console.error('Settings getByCategory error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req, res) {
    try {
      const { category } = req.params;
      const { value } = req.body;

      if (!settingsModel.isValidCategory(category)) {
        return res.status(400).json({ error: `Invalid category` });
      }
      if (!value || !value.trim()) {
        return res.status(400).json({ error: 'Value is required' });
      }

      const item = await settingsModel.create(category, value);
      res.status(201).json(item);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This value already exists in this category' });
      }
      console.error('Settings create error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req, res) {
    try {
      const { category, id } = req.params;
      const { value } = req.body;

      if (!settingsModel.isValidCategory(category)) {
        return res.status(400).json({ error: `Invalid category` });
      }
      if (!value || !value.trim()) {
        return res.status(400).json({ error: 'Value is required' });
      }

      const item = await settingsModel.update(id, value);
      if (!item) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json(item);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This value already exists in this category' });
      }
      console.error('Settings update error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete(req, res) {
    try {
      const { category, id } = req.params;

      if (!settingsModel.isValidCategory(category)) {
        return res.status(400).json({ error: `Invalid category` });
      }

      const item = await settingsModel.delete(id);
      if (!item) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error('Settings delete error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = settingsController;
