import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db';
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
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { google_id: googleId },
          { email: email }
        ]
      }
    });

    if (user) {
      // ── User exists: login ──
      // Update google_id and avatar if they came via a manual registration before
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: googleId,
            avatar_url: picture || null
          }
        });
      }

      const token = generateToken(user.id);
      
      // Exclude password_hash
      const { password_hash, ...safeUser } = user;

      res.status(200).json({
        success: true,
        isNewUser: false,
        user: safeUser,
        token,
        data: {
          user: safeUser,
          token
        }
      });
    } else {
      // ── New user: create with is_onboarded = true ──
      const defaultWorkspace = `${name || 'Operator'}'s Command Deck`;
      
      const newUser = await prisma.user.create({
        data: {
          google_id: googleId,
          email: email,
          name: name || 'User',
          avatar_url: picture || null,
          is_onboarded: true,
          workspace_name: defaultWorkspace,
          password_hash: '', // Set empty or dummy for Google auth
        }
      });

      const token = generateToken(newUser.id);
      const { password_hash, ...safeUser } = newUser;

      res.status(201).json({
        success: true,
        isNewUser: true,
        user: safeUser,
        token,
        data: {
          user: safeUser,
          token
        }
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name,
        role_track: role_track || null,
        workspace_name: workspace_name || `${name}'s Command Deck`,
        focus_target_hours: focus_target_hours || 4,
        is_onboarded: true,
      }
    });

    const { password_hash, ...safeUser } = updatedUser;

    res.status(200).json({
      success: true,
      user: safeUser
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
      res.status(400).json({ success: false, message: 'Harap isi semua field' });
      return;
    }

    // Cek apakah user sudah ada
    const userExists = await prisma.user.findUnique({
      where: { email: email }
    });

    if (userExists) {
      res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const defaultWorkspace = `${name}'s Command Deck`;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        is_onboarded: true,
        workspace_name: defaultWorkspace,
      }
    });

    const token = generateToken(newUser.id);
    const { password_hash, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      user: safeUser,
      token,
      data: {
        user: safeUser,
        token
      }
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
      res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Email atau password salah.' });
      return;
    }

    // Jika user dibuat dari Google Auth dan tidak punya password
    if (!user.password_hash) {
      res.status(401).json({
        success: false,
        message: 'Akun ini terdaftar menggunakan Google. Silakan klik tombol "Login with Google".'
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email atau password salah.' });
      return;
    }

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.status(200).json({
      success: true,
      user: safeUser,
      token,
      data: {
        user: safeUser,
        token
      }
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==================== GET CURRENT USER ====================
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { password_hash, ...safeUser } = user;
    res.status(200).json({ success: true, user: safeUser });
  } catch (error) {
    console.error('[Auth GetCurrentUser] Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
