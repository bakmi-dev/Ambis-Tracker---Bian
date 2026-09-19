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
  const rituals = await prisma.dailyRitual.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'asc' },
  });
  res.json({ success: true, data: rituals });
});

// POST /api/v1/rituals
export const createRitual = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, target } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const ritual = await prisma.dailyRitual.create({
    data: {
      user_id: userId,
      title: title.trim(),
      target: target || null,
    },
  });

  res.status(201).json({ success: true, data: ritual });
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

  const lastCompleted = existing.last_completed_date;
  let isCompletedToday = false;
  if (lastCompleted) {
    const lc = new Date(lastCompleted);
    lc.setUTCHours(0, 0, 0, 0);
    if (lc.getTime() === today.getTime()) {
      isCompletedToday = true;
    }
  }

  let updatedRitual;
  if (isCompletedToday) {
    // Un-toggle
    updatedRitual = await prisma.dailyRitual.update({
      where: { id },
      data: { last_completed_date: null },
    });
    // Remove XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { decrement: 5 } },
    });
  } else {
    // Toggle (Complete)
    updatedRitual = await prisma.dailyRitual.update({
      where: { id },
      data: { last_completed_date: new Date() }, // record current timestamp
    });
    // Add XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: 5 } },
    });
  }

  res.json({ success: true, data: updatedRitual });
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

  await prisma.dailyRitual.delete({ where: { id } });
  res.json({ success: true, message: 'Ritual deleted' });
});
