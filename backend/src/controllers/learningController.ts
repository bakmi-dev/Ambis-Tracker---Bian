import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/learning
export const getLearningMaterials = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { status } = req.query;

  const where: any = { user_id: userId };
  if (status && typeof status === 'string') where.status = status;

  const materials = await prisma.learningMaterial.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  res.json({ success: true, data: materials });
});

// POST /api/v1/learning
export const createLearningMaterial = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, type, url, status } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const material = await prisma.learningMaterial.create({
    data: {
      user_id: userId,
      title: title.trim(),
      type: type || null,
      url: url || null,
      status: status || 'not_started',
    },
  });

  res.status(201).json({ success: true, data: material });
});

// PATCH /api/v1/learning/:id
export const updateLearningMaterial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.learningMaterial.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Learning material not found' });
    return;
  }

  const { title, type, url, status } = req.body;

  const updated = await prisma.learningMaterial.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(type !== undefined && { type }),
      ...(url !== undefined && { url }),
      ...(status !== undefined && { status }),
    },
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/learning/:id
export const deleteLearningMaterial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.learningMaterial.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Learning material not found' });
    return;
  }

  await prisma.learningMaterial.delete({ where: { id } });
  res.json({ success: true, message: 'Learning material deleted' });
});
