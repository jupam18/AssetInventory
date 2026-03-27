const auditModel = require('../models/auditModel');

const auditController = {
  async getByAsset(req, res) {
    try {
      const { page, limit } = req.query;
      const result = await auditModel.findByAssetId(req.params.assetId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });
      res.json(result);
    } catch (err) {
      console.error('Get audit by asset error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async list(req, res) {
    try {
      const { page, limit, serial_number, action, performed_by } = req.query;
      const result = await auditModel.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        serial_number,
        action,
        performed_by,
      });
      res.json(result);
    } catch (err) {
      console.error('List audit error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = auditController;
