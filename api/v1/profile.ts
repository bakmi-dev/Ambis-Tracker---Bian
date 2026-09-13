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

  // Autentikasi
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

  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, bio, github, linkedin, website FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      return res.status(200).json({ success: true, user: result.rows[0] });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { name, avatar_url, role_track, bio, github, linkedin, website, workspace_name } = body;
      
      const result = await pool.query(
        `UPDATE users SET
          name = COALESCE($1, name),
          avatar_url = COALESCE($2, avatar_url),
          role_track = COALESCE($3, role_track),
          bio = COALESCE($4, bio),
          github = COALESCE($5, github),
          linkedin = COALESCE($6, linkedin),
          website = COALESCE($7, website),
          workspace_name = COALESCE($8, workspace_name),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, bio, github, linkedin, website`,
        [name, avatar_url, role_track, bio, github, linkedin, website, workspace_name, userId]
      );
      
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
      return res.status(200).json({ success: true, user: result.rows[0] });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('SERVERLESS_PROFILE_ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
