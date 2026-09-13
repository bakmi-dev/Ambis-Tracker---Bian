import express, { Request, Response } from 'express';
import prisma from '../db';

const router = express.Router();

// Helper to get or create the default user
const getOrCreateUser = async () => {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@ambistracker.com',
        name: 'Bian',
      }
    });
  }
  return user;
};

// GET /api/v1/profile
router.get('/', async (_req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser();
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/profile
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { name, profile_metadata } = req.body;
    let user = await getOrCreateUser();

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name }),
        ...(profile_metadata !== undefined && { profile_metadata })
      }
    });

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
