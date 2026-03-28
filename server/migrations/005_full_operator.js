const pool = require('../src/config/database');

const migration = `
-- Add full_operator to the role CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'asset_manager', 'incident_manager', 'full_operator', 'full_viewer', 'provider'));
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration 005: full_operator role added to users_role_check constraint');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 005 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
