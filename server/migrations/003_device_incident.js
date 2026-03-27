const pool = require('../src/config/database');

const migration = `
-- Add device_name and incident_number columns to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS incident_number VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_assets_device_name ON assets(device_name);
`;

const clearData = `
-- Clear all test data
DELETE FROM audit_log;
DELETE FROM assets;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query(clearData);
    await client.query('COMMIT');
    console.log('Migration 003: device_name and incident_number columns added');
    console.log('Migration 003: all test data cleared');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 003 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
