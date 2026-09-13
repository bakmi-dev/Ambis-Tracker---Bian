import { Pool } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'ambis_secret_fallback');
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, role_track, workspace_name, focus_target_hours } = body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Display name is required' });
    }

    const result = await pool.query(
      `UPDATE users SET
        name = $1,
        role_track = $2,
        workspace_name = $3,
        focus_target_hours = $4,
        is_onboarded = TRUE,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, google_id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, xp, current_streak, created_at`,
      [name, role_track || null, workspace_name || `${name}'s Command Deck`, focus_target_hours || 4, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
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
    console.error('SERVERLESS_ONBOARDING_ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
