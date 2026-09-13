import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'ambis_tracker_super_secret_jwt_key_2026', (err, user: any) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ success: false, message: 'Authorization header missing.' });
  }
};
