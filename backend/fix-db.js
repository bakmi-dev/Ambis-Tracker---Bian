const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query("UPDATE users SET password_hash = 'dummy_hash' WHERE password_hash IS NULL");
    console.log(`Updated ${res.rowCount} users.`);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
