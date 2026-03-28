const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// List & detail — all authenticated roles
router.get('/', authenticate, incidentController.list);
router.get('/:id', authenticate, incidentController.getById);

// Incidents linked to a specific asset
router.get('/by-asset/:assetId', authenticate, incidentController.getByAsset);

// Create — admin, full_operator, incident_manager
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.FULL_OPERATOR, ROLES.INCIDENT_MANAGER), incidentController.create);

// Update — admin, full_operator, incident_manager, provider (provider restriction enforced in controller)
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.FULL_OPERATOR, ROLES.INCIDENT_MANAGER, ROLES.PROVIDER), incidentController.update);

// Delete — admin only
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), incidentController.delete);

module.exports = router;
