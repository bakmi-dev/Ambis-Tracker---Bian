import { Pool } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    const user = result.rows[0];

    // Jika user dibuat dari Google Auth dan tidak punya password
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Akun ini terdaftar menggunakan Google. Silakan klik tombol "Login with Google".'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'ambis_secret_fallback',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_onboarded: user.is_onboarded,
        role_track: user.role_track,
        workspace_name: user.workspace_name,
        focus_target_hours: user.focus_target_hours
      }
    });
  } catch (err: any) {
    console.error('SERVERLESS_LOGIN_ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
