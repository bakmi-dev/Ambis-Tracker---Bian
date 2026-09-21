import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/goals
export const getGoals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const goals = await prisma.goal.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  res.json({ success: true, data: goals });
});

// POST /api/v1/goals
export const createGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, description, deadline, category, target_date, milestones } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const goal = await prisma.goal.create({
    data: {
      user_id: userId,
      title: title.trim(),
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
      target_date: target_date ? new Date(target_date) : null,
      category: category || null,
      milestones: milestones || [],
    },
  });

  res.status(201).json({ success: true, data: goal });
});

// PATCH /api/v1/goals/:id
export const updateGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.goal.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Goal not found' });
    return;
  }

  const { title, description, deadline, status, progress_percentage, category, target_date, milestones } = req.body;

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(target_date !== undefined && { target_date: target_date ? new Date(target_date) : null }),
      ...(status !== undefined && { status }),
      ...(progress_percentage !== undefined && { progress_percentage }),
      ...(category !== undefined && { category }),
      ...(milestones !== undefined && { milestones }),
    },
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/goals/:id
export const deleteGoal = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.goal.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Goal not found' });
    return;
  }

  await prisma.goal.delete({ where: { id } });
  res.json({ success: true, message: 'Goal deleted' });
});
