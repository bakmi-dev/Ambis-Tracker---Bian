import express, { Response } from 'express';
import { query } from '../config/db';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';

const router = express.Router();

// Helper to flatten profile_metadata
const formatUserResponse = (userRow: any) => {
  let parsedMetadata = {};
  if (userRow.profile_metadata) {
    try {
      parsedMetadata = JSON.parse(userRow.profile_metadata);
    } catch (e) {
      console.warn('Failed to parse profile_metadata');
    }
  }
  const finalUser = { ...userRow, ...parsedMetadata };
  delete finalUser.profile_metadata;
  return finalUser;
};

// GET /api/v1/profile
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await query('SELECT id, google_id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, xp, current_streak, created_at, profile_metadata FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = formatUserResponse(result.rows[0]);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('[Profile GET] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/profile
router.patch('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, role_track, workspace_name, avatar_url, bio, github, linkedin, website, location } = req.body;

    // First get current user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userRow = userResult.rows[0];
    
    // Parse existing metadata if any
    let metadata: any = {};
    try {
      if (userRow.profile_metadata) {
        metadata = JSON.parse(userRow.profile_metadata);
      }
    } catch (e) {
      console.warn('Failed to parse existing profile_metadata');
    }

    // Merge new metadata fields
    if (bio !== undefined) metadata['bio'] = bio;
    if (github !== undefined) metadata['github'] = github;
    if (linkedin !== undefined) metadata['linkedin'] = linkedin;
    if (website !== undefined) metadata['website'] = website;
    if (location !== undefined) metadata['location'] = location;

    const newMetadataString = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

    const result = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        role_track = COALESCE($2, role_track),
        workspace_name = COALESCE($3, workspace_name),
        avatar_url = COALESCE($4, avatar_url),
        profile_metadata = $5,
        updated_at = NOW()
       WHERE id = $6
       RETURNING id, google_id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, xp, current_streak, created_at, profile_metadata`,
      [name, role_track, workspace_name, avatar_url, newMetadataString, userId]
    );

    const user = formatUserResponse(result.rows[0]);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('[Profile PATCH] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
