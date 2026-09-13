import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/db';
import { AuthRequest } from '../middlewares/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'ambis_tracker_super_secret_jwt_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: generate app JWT
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
};

// ==================== GOOGLE OAUTH ====================
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ success: false, message: 'Google credential token is required' });
      return;
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      res.status(401).json({ success: false, message: 'Google verification failed or email not verified' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by google_id or email
    const existingUser = await query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleId, email]
    );

    if (existingUser.rows.length > 0) {
      // ── User exists: login ──
      const user = existingUser.rows[0];

      // Update google_id and avatar if they came via a manual registration before
      if (!user.google_id) {
        await query('UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3', [googleId, picture, user.id]);
        user.google_id = googleId;
        user.avatar_url = picture;
      }

      const token = generateToken(user.id);
      delete user.password_hash;

      res.status(200).json({
        success: true,
        isNewUser: false,
        data: { user, token }
      });
    } else {
      // ── New user: create with is_onboarded = false ──
      const insertResult = await query(
        `INSERT INTO users (google_id, email, name, avatar_url, is_onboarded)
         VALUES ($1, $2, $3, $4, FALSE)
         RETURNING id, google_id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, xp, current_streak, created_at`,
        [googleId, email, name || 'User', picture || null]
      );

      const newUser = insertResult.rows[0];
      const token = generateToken(newUser.id);

      res.status(201).json({
        success: true,
        isNewUser: true,
        data: { user: newUser, token }
      });
    }
  } catch (error: any) {
    console.error('[Auth Google] Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
};

// ==================== COMPLETE ONBOARDING ====================
export const completeOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, role_track, workspace_name, focus_target_hours } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Display name is required' });
      return;
    }

    const result = await query(
      `UPDATE users SET
        name = $1,
        role_track = $2,
        workspace_name = $3,
        focus_target_hours = $4,
        is_onboarded = TRUE,
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, google_id, email, name, avatar_url, role_track, workspace_name, focus_target_hours, is_onboarded, xp, current_streak, created_at`,
      [name, role_track || null, workspace_name || `${name}'s Command Deck`, focus_target_hours || 4, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('[Auth Onboarding] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== MANUAL REGISTER (email/password) ====================
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existingUserResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email is already registered' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, is_onboarded)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, email, xp, current_streak, is_onboarded, created_at`,
      [name, email, passwordHash]
    );

    const user = insertResult.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    console.error('[Auth Register] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== MANUAL LOGIN (email/password) ====================
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      res.status(401).json({ success: false, message: 'This account uses Google login. Please sign in with Google.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);
    delete user.password_hash;

    res.status(200).json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
