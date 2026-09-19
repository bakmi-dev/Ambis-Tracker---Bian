import { Pool } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
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
    const { credential, token } = body;
    const googleToken = credential || token;

    if (!googleToken) {
      return res.status(400).json({ success: false, message: 'Google token required' });
    }

    // Verifikasi ID Token Google
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid Google payload');
    
    const { email, name, picture, sub: google_id } = payload;

    // Cari atau daftarkan user ke Neon
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userResult.rows.length === 0) {
      const userId = randomUUID();
      const defaultWorkspace = `${name || 'Operator'}'s Command Deck`;
      const insertResult = await pool.query(
        `INSERT INTO users (id, google_id, email, name, avatar_url, is_onboarded, workspace_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [userId, google_id, email, name || 'User', picture || null, defaultWorkspace]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
      // Update google_id and avatar if they came via a manual registration before
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [google_id, picture, user.id]);
        user.google_id = google_id;
        user.avatar_url = picture;
      }
    }

    // Buat Session Token JWT
    const appToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'ambis_secret_fallback',
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_onboarded: user.is_onboarded,
      role_track: user.role_track,
      workspace_name: user.workspace_name,
      focus_target_hours: user.focus_target_hours
    };

    return res.status(200).json({
      success: true,
      isNewUser: !user.is_onboarded,
      token: appToken,
      user: userPayload,
      data: {
        token: appToken,
        user: userPayload
      }
    });
  } catch (err: any) {
    console.error('SERVERLESS_AUTH_ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
