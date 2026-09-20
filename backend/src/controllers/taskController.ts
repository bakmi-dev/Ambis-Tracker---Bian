import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

// For now we use a single default user. This will be replaced by auth later.
const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found. Run db:seed first.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/tasks
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { date, completed, priority } = req.query;

  let where: any = { user_id: userId };

  if (date && typeof date === 'string') {
    const d = new Date(date);
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    
    // Rollover logic: 
    // - Incomplete tasks due today or earlier
    // - Completed tasks completed today
    // - Fallback for old data completed today but missing completed_at
    where = {
      ...where,
      OR: [
        {
          is_completed: false,
          due_date: { lte: end }
        },
        {
          is_completed: true,
          completed_at: { gte: start, lte: end }
        },
        {
          is_completed: true,
          completed_at: null,
          due_date: { gte: start, lte: end }
        }
      ]
    };
  }

  if (completed === 'true') where.is_completed = true;
  if (completed === 'false') where.is_completed = false;
  if (priority && typeof priority === 'string') where.priority = priority;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ is_completed: 'asc' }, { created_at: 'desc' }],
  });

  res.json({ success: true, data: tasks });
});

// POST /api/v1/tasks
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const { title, description, priority, due_date, estimated_minutes, category, tags, xp } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const task = await prisma.task.create({
    data: {
      user_id: userId,
      title: title.trim(),
      description: description || null,
      priority: priority || 'medium',
      due_date: due_date ? new Date(due_date) : null,
      estimated_minutes: estimated_minutes || 25,
      category: category || null,
      tags: tags || [],
      xp: xp || 15,
    },
  });

  res.status(201).json({ success: true, data: task });
});

// PATCH /api/v1/tasks/:id
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.task.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const { title, description, priority, due_date, estimated_minutes, is_completed, category, tags, xp } = req.body;

  const dataToUpdate: any = {
    ...(title !== undefined && { title: title.trim() }),
    ...(description !== undefined && { description }),
    ...(priority !== undefined && { priority }),
    ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
    ...(estimated_minutes !== undefined && { estimated_minutes }),
    ...(is_completed !== undefined && { is_completed }),
    ...(category !== undefined && { category }),
    ...(tags !== undefined && { tags }),
    ...(xp !== undefined && { xp }),
  };

  if (is_completed === true && !existing.is_completed) {
    dataToUpdate.completed_at = new Date();
  } else if (is_completed === false && existing.is_completed) {
    dataToUpdate.completed_at = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: dataToUpdate,
  });

  // Award XP if task is completed for the first time
  if (is_completed === true && !existing.is_completed) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: updated.xp } },
    });
  } else if (is_completed === false && existing.is_completed) {
    // Reverse XP if unchecked
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { decrement: updated.xp } },
    });
  }

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/tasks/:id
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.task.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  await prisma.task.delete({ where: { id } });
  res.json({ success: true, message: 'Task deleted' });
});
