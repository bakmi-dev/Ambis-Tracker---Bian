import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/study-sessions
export const getStudySessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const sessions = await prisma.studySession.findMany({
    where: { user_id: userId },
    orderBy: { start_time: 'desc' },
  });
  res.json({ success: true, data: sessions });
});

// POST /api/v1/study-sessions
export const createStudySession = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, start_time, end_time, duration_minutes, session_type } = req.body;

  if (!start_time || !end_time || duration_minutes === undefined) {
    res.status(400).json({ success: false, error: 'start_time, end_time, and duration_minutes are required' });
    return;
  }

  const session = await prisma.studySession.create({
    data: {
      user_id: userId,
      title: title || null,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      duration_minutes,
      session_type: session_type || 'sprint',
    },
  });

  res.status(201).json({ success: true, data: session });
});

// DELETE /api/v1/study-sessions/:id
export const deleteStudySession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.studySession.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  await prisma.studySession.delete({ where: { id } });
  res.json({ success: true, message: 'Session deleted' });
});
