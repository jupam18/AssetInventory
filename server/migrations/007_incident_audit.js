const pool = require('../src/config/database');

const migration = `
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS incident_number VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_audit_log_incident_id ON audit_log(incident_id);
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration 007: added incident_id and incident_number columns to audit_log');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 007 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
