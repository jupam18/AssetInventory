const pool = require('../config/database');

const auditModel = {
  async create({ asset_id, serial_number, incident_id, incident_number, action, field_changed, old_value, new_value, performed_by, comment }) {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (asset_id, serial_number, incident_id, incident_number, action, field_changed, old_value, new_value, performed_by, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [asset_id || null, serial_number || null, incident_id || null, incident_number || null, action, field_changed || null, old_value || null, new_value || null, performed_by, comment || null]
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
          `INSERT INTO audit_log (asset_id, serial_number, incident_id, incident_number, action, field_changed, old_value, new_value, performed_by, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [entry.asset_id || null, entry.serial_number || null, entry.incident_id || null, entry.incident_number || null, entry.action, entry.field_changed || null, entry.old_value || null, entry.new_value || null, entry.performed_by, entry.comment || null]
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

  async findByIncidentId(incidentId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const [countResult, dataResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM audit_log WHERE incident_id = $1', [incidentId]),
      pool.query(
        'SELECT * FROM audit_log WHERE incident_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [incidentId, limit, offset]
      ),
    ]);

    return {
      logs: dataResult.rows,
      total: countResult.rows[0].count,
      page,
      limit,
    };
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

  async findAll({ page = 1, limit = 50, search, action, performed_by, field_changed, comment } = {}) {
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(serial_number ILIKE $${paramIdx} OR incident_number ILIKE $${paramIdx} OR old_value ILIKE $${paramIdx} OR new_value ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }
    if (action) {
      conditions.push(`action = $${paramIdx++}`);
      values.push(action);
    }
    if (performed_by) {
      conditions.push(`performed_by ILIKE $${paramIdx++}`);
      values.push(`%${performed_by}%`);
    }
    if (field_changed) {
      conditions.push(`field_changed ILIKE $${paramIdx++}`);
      values.push(`%${field_changed}%`);
    }
    if (comment) {
      conditions.push(`comment ILIKE $${paramIdx++}`);
      values.push(`%${comment}%`);
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
