const pool = require('../src/config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE audit_log ALTER COLUMN serial_number DROP NOT NULL`);
    await client.query('COMMIT');
    console.log('Migration 008: serial_number in audit_log is now nullable');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 008 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
