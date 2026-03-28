const express = require('express');
const router = express.Router();
const multer = require('multer');
const assetController = require('../controllers/assetController');
const auditController = require('../controllers/auditController');
const importExportController = require('../controllers/importExportController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Dashboard
router.get('/dashboard', authenticate, assetController.getDashboard);

// Export (all authenticated users)
router.get('/export/csv', authenticate, importExportController.exportCSV);
router.get('/export/excel', authenticate, importExportController.exportExcel);
router.get('/export/audit', authenticate, importExportController.exportAuditCSV);

// Import (admin, asset_manager, full_operator)
router.post('/import/csv', authenticate, authorize(ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.FULL_OPERATOR), upload.single('file'), importExportController.importCSV);

// Audit log
router.get('/audit', authenticate, auditController.list);
router.get('/audit/:assetId', authenticate, auditController.getByAsset);

// CRUD
router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.FULL_OPERATOR), assetController.create);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.FULL_OPERATOR), assetController.update);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), assetController.delete);

module.exports = router;
