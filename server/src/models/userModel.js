const pool = require('../config/database');

const userModel = {
  async findByUsername(username) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0];
  },

  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  async create({ username, email, password_hash, full_name, role }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, password_hash, full_name, role]
    );
    return rows[0];
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`${key} = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      values
    );
    return rows[0];
  },
};

module.exports = userModel;
