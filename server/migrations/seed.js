const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create default admin user (password: admin123)
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ('admin', 'admin@company.com', $1, 'System Administrator', 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [adminHash]);

    // Create default technician (password: tech123)
    const techHash = await bcrypt.hash('tech123', 10);
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ('technician', 'tech@company.com', $1, 'Default Technician', 'technician')
      ON CONFLICT (username) DO NOTHING
    `, [techHash]);

    // Create default auditor (password: audit123)
    const auditHash = await bcrypt.hash('audit123', 10);
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ('auditor', 'auditor@company.com', $1, 'Default Auditor', 'auditor')
      ON CONFLICT (username) DO NOTHING
    `, [auditHash]);

    await client.query('COMMIT');
    console.log('Seed completed successfully');
    console.log('Default users created:');
    console.log('  admin / admin123 (Admin)');
    console.log('  technician / tech123 (Technician)');
    console.log('  auditor / audit123 (Auditor)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
