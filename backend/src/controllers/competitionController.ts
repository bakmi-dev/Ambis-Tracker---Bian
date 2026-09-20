import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/competitions
export const getCompetitions = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const competitions = await prisma.competition.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  res.json({ success: true, data: competitions });
});

// POST /api/v1/competitions
export const createCompetition = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, description, organizer, type, deadline, timeline, outcome, links, documentation_images } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const competition = await prisma.competition.create({
    data: {
      user_id: userId,
      title: title.trim(),
      description: description || null,
      organizer: organizer || null,
      type: type || null,
      deadline: deadline ? new Date(deadline) : null,
      timeline: timeline || null,
      outcome: outcome || null,
      links: links || null,
      documentation_images: documentation_images || null,
    },
  });

  res.status(201).json({ success: true, data: competition });
});

// PATCH /api/v1/competitions/:id
export const updateCompetition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.competition.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Competition not found' });
    return;
  }

  const { title, description, organizer, type, deadline, status, timeline, outcome, links, documentation_images } = req.body;

  const updated = await prisma.competition.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(organizer !== undefined && { organizer }),
      ...(type !== undefined && { type }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      ...(status !== undefined && { status }),
      ...(timeline !== undefined && { timeline }),
      ...(outcome !== undefined && { outcome }),
      ...(links !== undefined && { links }),
      ...(documentation_images !== undefined && { documentation_images }),
    },
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/competitions/:id
export const deleteCompetition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.competition.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Competition not found' });
    return;
  }

  await prisma.competition.delete({ where: { id } });
  res.json({ success: true, message: 'Competition deleted' });
});
