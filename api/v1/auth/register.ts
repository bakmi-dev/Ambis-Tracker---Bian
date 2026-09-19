import { Pool } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: any, res: any) {
  // Izinkan CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Harap isi semua field' });
    }

    // Cek apakah user sudah ada
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = randomUUID();
    const defaultWorkspace = `${name}'s Command Deck`;

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, is_onboarded, workspace_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, role_track, workspace_name, focus_target_hours, is_onboarded, created_at, updated_at`,
      [userId, name, email, passwordHash, defaultWorkspace]
    );

    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'ambis_secret_fallback',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: newUser,
      data: {
        token,
        user: newUser
      }
    });
  } catch (err: any) {
    console.error('SERVERLESS_REGISTER_ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
