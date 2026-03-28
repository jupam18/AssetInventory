const pool = require('../src/config/database');

const migration = `
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Onboarding', 'Offboarding', 'Other')),
  status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Pending', 'Closed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  description TEXT,
  body TEXT,
  notes TEXT,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_assets (
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_number ON incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_incident_assets_asset_id ON incident_assets(asset_id);
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('Migration 006: incidents and incident_assets tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 006 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
