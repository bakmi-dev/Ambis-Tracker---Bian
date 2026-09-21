import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/analytics/summary
// Returns dashboard aggregate: XP, streak, tasks completed today, focus time today, upcoming deadlines
export const getDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setUTCHours(23, 59, 59, 999);

  // User data
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Tasks completed today
  const todayTasksTotal = await prisma.task.count({
    where: { user_id: userId, due_date: { gte: startOfDay, lte: endOfDay } },
  });
  const todayTasksCompleted = await prisma.task.count({
    where: { user_id: userId, due_date: { gte: startOfDay, lte: endOfDay }, is_completed: true },
  });

  // Total tasks overall
  const totalTasks = await prisma.task.count({ where: { user_id: userId } });
  const totalTasksCompleted = await prisma.task.count({ where: { user_id: userId, is_completed: true } });

  // Focus time today
  const sessionsToday = await prisma.studySession.findMany({
    where: { user_id: userId, start_time: { gte: startOfDay, lte: endOfDay } },
  });
  const focusTimeMinutesToday = sessionsToday.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);

  // Total focus time all time
  const allSessions = await prisma.studySession.aggregate({
    where: { user_id: userId },
    _sum: { duration_minutes: true },
  });
  const totalFocusMinutes = allSessions._sum.duration_minutes || 0;

  // Active goals
  const activeGoals = await prisma.goal.count({ where: { user_id: userId, status: 'active' } });

  // Active competitions
  const activeCompetitions = await prisma.competition.count({
    where: { user_id: userId, status: { in: ['preparation', 'active'] } },
  });

  // Active projects
  const activeProjects = await prisma.project.count({ where: { user_id: userId, status: 'active' } });

  // Journal entries count
  const journalCount = await prisma.journalEntry.count({ where: { user_id: userId } });

  // Knowledge docs count
  const knowledgeCount = await prisma.knowledgeDoc.count({ where: { user_id: userId } });

  res.json({
    success: true,
    data: {
      user: {
        name: user?.name || 'Bian',
        xp: user?.xp || 0,
        streak: user?.current_streak || 0,
      },
      today: {
        tasksTotal: todayTasksTotal,
        tasksCompleted: todayTasksCompleted,
        focusTimeMinutes: focusTimeMinutesToday,
        sessionsCount: sessionsToday.length,
      },
      overall: {
        totalTasks,
        totalTasksCompleted,
        totalFocusMinutes,
        activeGoals,
        activeCompetitions,
        activeProjects,
        journalCount,
        knowledgeCount,
      },
    },
  });
});
