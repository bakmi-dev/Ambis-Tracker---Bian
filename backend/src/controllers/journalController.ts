import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/journal
export const getJournalEntries = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const entries = await prisma.journalEntry.findMany({
    where: { user_id: userId },
    orderBy: { entry_date: 'desc' },
  });
  res.json({ success: true, data: entries });
});

// POST /api/v1/journal
export const createJournalEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, content, entry_date, emotion_tag } = req.body;

  if (!content || typeof content !== 'string' || content.trim() === '') {
    res.status(400).json({ success: false, error: 'Content is required' });
    return;
  }

  const entry = await prisma.journalEntry.create({
    data: {
      user_id: userId,
      title: title || null,
      content: content.trim(),
      entry_date: entry_date ? new Date(entry_date) : new Date(),
      emotion_tag: emotion_tag || null,
    },
  });

  res.status(201).json({ success: true, data: entry });
});

// PATCH /api/v1/journal/:id
export const updateJournalEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.journalEntry.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Journal entry not found' });
    return;
  }

  const { title, content, entry_date, emotion_tag } = req.body;

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content: content.trim() }),
      ...(entry_date !== undefined && { entry_date: new Date(entry_date) }),
      ...(emotion_tag !== undefined && { emotion_tag }),
    },
  });

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/journal/:id
export const deleteJournalEntry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const existing = await prisma.journalEntry.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Journal entry not found' });
    return;
  }

  await prisma.journalEntry.delete({ where: { id } });
  res.json({ success: true, message: 'Journal entry deleted' });
});
