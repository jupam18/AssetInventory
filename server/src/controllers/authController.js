const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { ROLES } = require('../config/constants');

const authController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await userModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await userModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getUsers(req, res) {
    try {
      const users = await userModel.findAll();
      res.json(users);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async createUser(req, res) {
    try {
      const { username, email, password, full_name, role } = req.body;
      if (!username || !email || !password || !full_name || !role) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const user = await userModel.create({ username, email, password_hash, full_name, role });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      console.error('Create user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, full_name, role, is_active, password } = req.body;
      const fields = {};

      if (email !== undefined) fields.email = email;
      if (full_name !== undefined) fields.full_name = full_name;
      if (role !== undefined) {
        if (!Object.values(ROLES).includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        fields.role = role;
      }
      if (is_active !== undefined) fields.is_active = is_active;
      if (password) fields.password_hash = await bcrypt.hash(password, 10);

      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const user = await userModel.update(id, fields);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = authController;
