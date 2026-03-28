const pool = require('../config/database');

const incidentModel = {
  async getAll({ status, type, priority, assigned_to, search, userId, userRole, page = 1, limit = 25, sort_by = 'created_at', sort_order = 'DESC' }) {
    const conditions = [];
    const values = [];
    let paramIdx = 1;

    // providers can only see their own incidents
    if (userRole === 'provider') {
      conditions.push(`i.assigned_to = $${paramIdx++}`);
      values.push(userId);
    }

    if (status) {
      conditions.push(`i.status = $${paramIdx++}`);
      values.push(status);
    }
    if (type) {
      conditions.push(`i.type = $${paramIdx++}`);
      values.push(type);
    }
    if (priority) {
      conditions.push(`i.priority = $${paramIdx++}`);
      values.push(priority);
    }
    if (assigned_to) {
      conditions.push(`i.assigned_to = $${paramIdx++}`);
      values.push(assigned_to);
    }
    if (search) {
      conditions.push(`(i.incident_number ILIKE $${paramIdx} OR i.title ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['incident_number', 'title', 'type', 'status', 'priority', 'assigned_to', 'created_at', 'updated_at', 'closed_at'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) FROM incidents i ${whereClause}`;
    const dataQuery = `
      SELECT i.*,
             u.full_name AS assigned_to_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.assigned_to
      ${whereClause}
      ORDER BY i.${safeSort} ${safeOrder}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    values.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(dataQuery, values),
    ]);

    return {
      incidents: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  },

  async getById(id) {
    const { rows } = await pool.query(
      `SELECT i.*,
              u_assigned.full_name AS assigned_to_name,
              u_created.full_name  AS created_by_name
       FROM incidents i
       LEFT JOIN users u_assigned ON u_assigned.id = i.assigned_to
       LEFT JOIN users u_created  ON u_created.id  = i.created_by
       WHERE i.id = $1`,
      [id]
    );
    if (!rows[0]) return null;

    const incident = rows[0];

    const { rows: assetRows } = await pool.query(
      `SELECT a.id, a.serial_number, a.device_name, a.asset_type, a.make, a.model, a.status
       FROM assets a
       JOIN incident_assets ia ON ia.asset_id = a.id
       WHERE ia.incident_id = $1`,
      [id]
    );
    incident.assets = assetRows;

    return incident;
  },

  async create({ title, type, status, priority, description, body, notes, assigned_to, created_by, asset_ids = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Auto-generate incident_number: INC-001, INC-002, ...
      const { rows: numRows } = await client.query(
        `SELECT COALESCE(MAX(
          CASE WHEN incident_number ~ '^INC-[0-9]+$'
          THEN CAST(SUBSTRING(incident_number FROM 5) AS INTEGER)
          ELSE 0 END
        ), 0) + 1 AS next_num FROM incidents`
      );
      const incident_number = `INC-${String(numRows[0].next_num).padStart(3, '0')}`;

      const { rows } = await client.query(
        `INSERT INTO incidents (incident_number, title, type, status, priority, description, body, notes, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [incident_number, title, type, status || 'Open', priority || 'Medium', description || null, body || null, notes || null, assigned_to || null, created_by]
      );
      const incident = rows[0];

      if (asset_ids.length > 0) {
        const placeholders = asset_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO incident_assets (incident_id, asset_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
          [incident.id, ...asset_ids]
        );
      }

      await client.query('COMMIT');
      return this.getById(incident.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, { title, type, status, priority, description, body, notes, assigned_to, asset_ids }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM incidents WHERE id = $1', [id]);
      if (!existing.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const setClauses = [];
      const values = [];
      let paramIdx = 1;

      const fields = { title, type, status, priority, description, body, notes, assigned_to };
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIdx++}`);
          values.push(value === '' ? null : value);
        }
      }

      // set closed_at when transitioning to Closed
      if (status === 'Closed' && existing.rows[0].status !== 'Closed') {
        setClauses.push(`closed_at = NOW()`);
      } else if (status && status !== 'Closed' && existing.rows[0].status === 'Closed') {
        setClauses.push(`closed_at = NULL`);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      if (setClauses.length > 1) {
        await client.query(
          `UPDATE incidents SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
          values
        );
      }

      // re-sync incident_assets if provided
      if (asset_ids !== undefined) {
        await client.query('DELETE FROM incident_assets WHERE incident_id = $1', [id]);
        if (asset_ids.length > 0) {
          const placeholders = asset_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO incident_assets (incident_id, asset_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
            [id, ...asset_ids]
          );
        }
      }

      await client.query('COMMIT');
      return this.getById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id) {
    const { rows } = await pool.query('SELECT status FROM incidents WHERE id = $1', [id]);
    if (!rows[0]) return { error: 'not_found' };
    if (rows[0].status !== 'Closed') return { error: 'not_closed' };

    const { rows: deleted } = await pool.query('DELETE FROM incidents WHERE id = $1 RETURNING *', [id]);
    return { incident: deleted[0] };
  },

  async getByAssetId(assetId) {
    const { rows } = await pool.query(
      `SELECT i.*, u.full_name AS assigned_to_name
       FROM incidents i
       JOIN incident_assets ia ON ia.incident_id = i.id
       LEFT JOIN users u ON u.id = i.assigned_to
       WHERE ia.asset_id = $1
       ORDER BY i.created_at DESC`,
      [assetId]
    );
    return rows;
  },
};

module.exports = incidentModel;
