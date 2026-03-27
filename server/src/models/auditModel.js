const pool = require('../config/database');

const auditModel = {
  async create({ asset_id, serial_number, action, field_changed, old_value, new_value, performed_by, comment }) {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (asset_id, serial_number, action, field_changed, old_value, new_value, performed_by, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [asset_id, serial_number, action, field_changed || null, old_value || null, new_value || null, performed_by, comment || null]
    );
    return rows[0];
  },

  async createMany(entries) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const entry of entries) {
        const { rows } = await client.query(
          `INSERT INTO audit_log (asset_id, serial_number, action, field_changed, old_value, new_value, performed_by, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [entry.asset_id, entry.serial_number, entry.action, entry.field_changed || null, entry.old_value || null, entry.new_value || null, entry.performed_by, entry.comment || null]
        );
        results.push(rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findByAssetId(assetId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM audit_log WHERE asset_id = $1', [assetId]),
      pool.query(
        'SELECT * FROM audit_log WHERE asset_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [assetId, limit, offset]
      ),
    ]);

    return {
      logs: dataResult.rows,
      total: countResult.rows[0].count,
      page,
      limit,
    };
  },

  async findAll({ page = 1, limit = 50, serial_number, action, performed_by } = {}) {
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (serial_number) {
      conditions.push(`serial_number ILIKE $${paramIdx++}`);
      values.push(`%${serial_number}%`);
    }
    if (action) {
      conditions.push(`action = $${paramIdx++}`);
      values.push(action);
    }
    if (performed_by) {
      conditions.push(`performed_by ILIKE $${paramIdx++}`);
      values.push(`%${performed_by}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count FROM audit_log ${whereClause}`, values),
      pool.query(
        `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    return {
      logs: dataResult.rows,
      total: countResult.rows[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    };
  },
};

module.exports = auditModel;
