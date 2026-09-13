import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS github VARCHAR(255),
      ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255);
    `);
    console.log('Successfully added profile columns to users table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
