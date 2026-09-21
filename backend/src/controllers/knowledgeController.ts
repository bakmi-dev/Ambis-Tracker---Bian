import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/knowledge
export const getKnowledgeDocs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { category, pinned } = req.query;

  const where: any = { user_id: userId };
  if (category && typeof category === 'string') where.category = category;
  if (pinned === 'true') where.is_pinned = true;

  const docs = await prisma.knowledgeDoc.findMany({
    where,
    orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
  });
  res.json({ success: true, data: docs });
});

// GET /api/v1/knowledge/:id
export const getKnowledgeDoc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const doc = await prisma.knowledgeDoc.findFirst({ where: { id, user_id: userId } });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  res.json({ success: true, data: doc });
});

// POST /api/v1/knowledge
export const createKnowledgeDoc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, content, category, is_pinned, tags } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const doc = await prisma.knowledgeDoc.create({
    data: {
      user_id: userId,
      title: title.trim(),
      content: content || '',
      category: category || null,
      is_pinned: is_pinned || false,
      tags: tags || [],
    },
  });

  res.status(201).json({ success: true, data: doc });
});

// PATCH /api/v1/knowledge/:id
export const updateKnowledgeDoc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.knowledgeDoc.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  const { title, content, category, is_pinned, tags } = req.body;

  const updated = await prisma.knowledgeDoc.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(is_pinned !== undefined && { is_pinned }),
      ...(tags !== undefined && { tags }),
    },
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/knowledge/:id
export const deleteKnowledgeDoc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.knowledgeDoc.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  await prisma.knowledgeDoc.delete({ where: { id } });
  res.json({ success: true, message: 'Document deleted' });
});
