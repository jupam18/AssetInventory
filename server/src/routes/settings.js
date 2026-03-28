const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// All authenticated users can read settings (needed to populate dropdowns)
router.get('/', authenticate, settingsController.getAll);
router.get('/:category', authenticate, settingsController.getByCategory);

// Only admins can manage settings
router.post('/:category', authenticate, authorize(ROLES.ADMIN), settingsController.create);
router.put('/:category/:id', authenticate, authorize(ROLES.ADMIN), settingsController.update);
router.delete('/:category/:id', authenticate, authorize(ROLES.ADMIN), settingsController.delete);

module.exports = router;
