import { Request, Response } from 'express';
import prisma, { query } from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';
import { AuthRequest } from '../middlewares/auth';

// GET /api/v1/study-sessions
export const getStudySessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const sessions = await prisma.studySession.findMany({
    where: { user_id: userId },
    orderBy: { start_time: 'desc' },
  });
  res.json({ success: true, data: sessions });
});

// POST /api/v1/study-sessions
export const createStudySession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const { title, start_time, end_time, duration_minutes, session_type, takeaway } = req.body;

  if (!start_time || !end_time || duration_minutes === undefined) {
    res.status(400).json({ success: false, error: 'start_time, end_time, and duration_minutes are required' });
    return;
  }

  // Create session
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

  // Create KnowledgeDoc if takeaway exists
  if (takeaway && typeof takeaway === 'string' && takeaway.trim() !== '') {
    await prisma.knowledgeDoc.create({
      data: {
        user_id: userId,
        title: `Sintesis: ${title || 'Sesi Fokus'}`,
        content: takeaway.trim(),
        category: session_type || 'sprint',
        tags: ['auto-sync', 'study-session']
      }
    });
  }

  // Calculate XP (1 min = 1 XP)
  const xpEarned = parseInt(duration_minutes, 10);

  // Check if streak needs updating (if this is the first session today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sessionsToday = await prisma.studySession.count({
    where: {
      user_id: userId,
      start_time: { gte: todayStart },
      id: { not: session.id }
    }
  });

  let newStreak = undefined;
  if (sessionsToday === 0) {
    // Increment streak
    const updateRes = await query(`UPDATE users SET xp = xp + $1, current_streak = current_streak + 1 WHERE id = $2 RETURNING xp, current_streak`, [xpEarned, userId]);
    newStreak = updateRes.rows[0].current_streak;
  } else {
    // Just update XP
    await query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [xpEarned, userId]);
  }

  res.status(201).json({ 
    success: true, 
    data: session, 
    xpEarned,
    newStreak
  });
});

// DELETE /api/v1/study-sessions/:id
export const deleteStudySession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const existing = await prisma.studySession.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  await prisma.studySession.delete({ where: { id } });
  res.json({ success: true, message: 'Session deleted' });
});
