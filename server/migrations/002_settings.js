const pool = require('../src/config/database');

const migration = `
-- Settings list table for admin-managed dropdown values
CREATE TABLE IF NOT EXISTS settings_list (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category, value)
);

CREATE INDEX IF NOT EXISTS idx_settings_list_category ON settings_list(category);

-- Add client column to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS client VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client);

-- Drop hardcoded asset_type CHECK constraint so admin can manage types freely
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_type_check;

-- Seed default values for all three categories
INSERT INTO settings_list (category, value) VALUES
  ('asset_type', 'PC'),
  ('asset_type', 'Laptop'),
  ('asset_type', 'Server'),
  ('asset_type', 'Mobile'),
  ('asset_type', 'Token'),
  ('asset_type', 'Other')
ON CONFLICT (category, value) DO NOTHING;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration 002_settings completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 002_settings failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
