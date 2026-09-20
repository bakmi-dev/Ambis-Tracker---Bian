import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found. Run db:seed first.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/rituals
export const getRituals = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rituals = await prisma.dailyRitual.findMany({
    where: { user_id: userId, is_active: true },
    orderBy: { created_at: 'asc' },
    include: {
      logs: {
        where: {
          completed_date: today,
        }
      }
    }
  });

  const formattedRituals = rituals.map(ritual => ({
    id: ritual.id,
    title: ritual.title,
    target_minutes: ritual.target_minutes,
    is_completed: ritual.logs.length > 0,
  }));

  res.json({ success: true, data: formattedRituals });
});

// POST /api/v1/rituals
export const createRitual = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, target_minutes } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const ritual = await prisma.dailyRitual.create({
    data: {
      user_id: userId,
      title: title.trim(),
      target_minutes: target_minutes ? parseInt(target_minutes, 10) : 30,
    },
  });

  res.status(201).json({ success: true, data: { ...ritual, is_completed: false } });
});

// PATCH /api/v1/rituals/:id/toggle
export const toggleRitual = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.dailyRitual.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Ritual not found' });
    return;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existingLog = await prisma.dailyRitualLog.findFirst({
    where: {
      ritual_id: id,
      user_id: userId,
      completed_date: today
    }
  });

  let is_completed = false;

  if (existingLog) {
    // Un-toggle
    await prisma.dailyRitualLog.delete({ where: { id: existingLog.id } });
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { decrement: 10 } },
    });
    is_completed = false;
  } else {
    // Toggle
    await prisma.dailyRitualLog.create({
      data: {
        ritual_id: id,
        user_id: userId,
        completed_date: today
      }
    });
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 10 } },
    });
    is_completed = true;
  }

  res.json({ success: true, data: { ...existing, is_completed } });
});

// DELETE /api/v1/rituals/:id
export const deleteRitual = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.dailyRitual.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Ritual not found' });
    return;
  }

  // Soft delete
  await prisma.dailyRitual.update({
    where: { id },
    data: { is_active: false }
  });

  res.json({ success: true, message: 'Ritual deleted' });
});
