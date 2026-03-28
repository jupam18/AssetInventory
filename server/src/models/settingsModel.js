const pool = require('../config/database');

const VALID_CATEGORIES = ['asset_type', 'location', 'client'];

const settingsModel = {
  isValidCategory(category) {
    return VALID_CATEGORIES.includes(category);
  },

  async findByCategory(category) {
    const { rows } = await pool.query(
      'SELECT * FROM settings_list WHERE category = $1 ORDER BY value ASC',
      [category]
    );
    return rows;
  },

  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM settings_list ORDER BY category ASC, value ASC'
    );
    return rows;
  },

  async create(category, value) {
    const { rows } = await pool.query(
      'INSERT INTO settings_list (category, value) VALUES ($1, $2) RETURNING *',
      [category, value.trim()]
    );
    return rows[0];
  },

  async update(id, value) {
    const { rows } = await pool.query(
      'UPDATE settings_list SET value = $1 WHERE id = $2 RETURNING *',
      [value.trim(), id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM settings_list WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  },

  async valueExists(category, value) {
    const { rows } = await pool.query(
      'SELECT id FROM settings_list WHERE category = $1 AND value = $2',
      [category, value]
    );
    return rows.length > 0;
  },
};

module.exports = settingsModel;
