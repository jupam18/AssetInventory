const pool = require('../config/database');

const assetModel = {
  async findAll({ page = 1, limit = 50, status, asset_type, location, client, search, sort_by = 'created_at', sort_order = 'DESC' }) {
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(status);
    }
    if (asset_type) {
      conditions.push(`a.asset_type = $${paramIdx++}`);
      values.push(asset_type);
    }
    if (location) {
      conditions.push(`a.location = $${paramIdx++}`);
      values.push(location);
    }
    if (client) {
      conditions.push(`a.client = $${paramIdx++}`);
      values.push(client);
    }
    if (search) {
      conditions.push(`(a.serial_number ILIKE $${paramIdx} OR a.device_name ILIKE $${paramIdx} OR a.make ILIKE $${paramIdx} OR a.model ILIKE $${paramIdx} OR a.assigned_to ILIKE $${paramIdx} OR a.incident_number ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['serial_number', 'device_name', 'asset_type', 'make', 'model', 'location', 'client', 'status', 'warranty_date', 'incident_number', 'created_at', 'updated_at'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM assets a ${whereClause}`;
    const dataQuery = `SELECT a.* FROM assets a ${whereClause} ORDER BY a.${safeSort} ${safeOrder} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    values.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(dataQuery, values),
    ]);

    return {
      assets: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    return rows[0];
  },

  async findBySerialNumber(serialNumber) {
    const { rows } = await pool.query('SELECT * FROM assets WHERE serial_number = $1', [serialNumber]);
    return rows[0];
  },

  async create({ serial_number, device_name, asset_type, make, model, location, client, assigned_to, status, warranty_date, commentary, incident_number }) {
    const { rows } = await pool.query(
      `INSERT INTO assets (serial_number, device_name, asset_type, make, model, location, client, assigned_to, status, warranty_date, commentary, incident_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [serial_number, device_name || null, asset_type, make || null, model || null, location || null, client || null, assigned_to || null, status || 'Available', warranty_date || null, commentary || null, incident_number || null]
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
      `UPDATE assets SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query('DELETE FROM assets WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async getWarrantyAlerts(days = 30) {
    const { rows } = await pool.query(
      `SELECT * FROM assets
       WHERE warranty_date IS NOT NULL
         AND warranty_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
         AND warranty_date >= CURRENT_DATE
         AND status NOT IN ('Decommissioned', 'Returned to Client')
       ORDER BY warranty_date ASC`,
      [days]
    );
    return rows;
  },

  async getDashboardStats() {
    const [byStatus, byType, byLocation, byClient, totalCount] = await Promise.all([
      pool.query(`SELECT status, COUNT(*)::int as count FROM assets GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT asset_type, COUNT(*)::int as count FROM assets GROUP BY asset_type ORDER BY count DESC`),
      pool.query(`SELECT COALESCE(location, 'Unspecified') as location, COUNT(*)::int as count FROM assets GROUP BY location ORDER BY count DESC`),
      pool.query(`SELECT COALESCE(client, 'Unassigned') as client, COUNT(*)::int as count FROM assets GROUP BY client ORDER BY count DESC`),
      pool.query(`SELECT COUNT(*)::int as total FROM assets`),
    ]);

    return {
      total: totalCount.rows[0].total,
      byStatus: byStatus.rows,
      byType: byType.rows,
      byLocation: byLocation.rows,
      byClient: byClient.rows,
    };
  },

  async findAllForExport(filters = {}) {
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIdx++}`);
      values.push(filters.status);
    }
    if (filters.asset_type) {
      conditions.push(`asset_type = $${paramIdx++}`);
      values.push(filters.asset_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM assets ${whereClause} ORDER BY serial_number ASC`, values);
    return rows;
  },
};

module.exports = assetModel;
