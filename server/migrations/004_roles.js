const pool = require('../src/config/database');

const migration = `
-- Drop old CHECK constraint first, then migrate data, then add new constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'asset_manager' WHERE role = 'technician';
UPDATE users SET role = 'full_viewer'   WHERE role = 'auditor';

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'asset_manager', 'incident_manager', 'full_viewer', 'provider'));
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration 004: roles updated (technician→asset_manager, auditor→full_viewer)');
    console.log('Migration 004: users_role_check constraint updated');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 004 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
