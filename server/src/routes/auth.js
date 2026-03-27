const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.post('/login', authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.get('/users', authenticate, authorize(ROLES.ADMIN), authController.getUsers);
router.post('/users', authenticate, authorize(ROLES.ADMIN), authController.createUser);
router.put('/users/:id', authenticate, authorize(ROLES.ADMIN), authController.updateUser);

module.exports = router;
