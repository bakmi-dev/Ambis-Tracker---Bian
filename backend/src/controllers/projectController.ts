import { Request, Response } from 'express';
import prisma from '../db';
import { asyncHandler } from '../middlewares/errorMiddleware';

const getDefaultUserId = async (): Promise<string> => {
  const user = await prisma.user.findFirst();
  if (!user) throw Object.assign(new Error('No default user found.'), { statusCode: 500 });
  return user.id;
};

// GET /api/v1/projects
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const projects = await prisma.project.findMany({
    where: { user_id: userId },
    include: { tasks: true },
    orderBy: { created_at: 'desc' },
  });
  res.json({ success: true, data: projects });
});

// POST /api/v1/projects
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = await getDefaultUserId();
  const {
    title, description, deadline, status,
    priority, progress_percent, logo_url, category,
    prd_url, design_url, repo_url, demo_url
  } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const project = await prisma.project.create({
    data: {
      user_id: userId,
      title: title.trim(),
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
      status: status || 'Planning',
      priority: priority || 'MEDIUM',
      progress_percent: progress_percent !== undefined ? Number(progress_percent) : 0,
      logo_url: logo_url || null,
      category: category || 'Engineering',
      prd_url: prd_url || null,
      design_url: design_url || null,
      repo_url: repo_url || null,
      demo_url: demo_url || null,
    },
    include: { tasks: true },
  });

  res.status(201).json({ success: true, data: project });
});

// PATCH /api/v1/projects/:id
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.project.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const {
    title, description, deadline, status,
    priority, progress_percent, logo_url, category,
    prd_url, design_url, repo_url, demo_url
  } = req.body;

  const updated = await prisma.project.update({
    where: { id },
    data: {
      title: title !== undefined ? title.trim() : undefined,
      description: description !== undefined ? description : undefined,
      deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
      status: status !== undefined ? status : undefined,
      priority: priority !== undefined ? priority : undefined,
      progress_percent: progress_percent !== undefined ? Number(progress_percent) : undefined,
      logo_url: logo_url !== undefined ? logo_url : undefined,
      category: category !== undefined ? category : undefined,
      prd_url: prd_url !== undefined ? prd_url : undefined,
      design_url: design_url !== undefined ? design_url : undefined,
      repo_url: repo_url !== undefined ? repo_url : undefined,
      demo_url: demo_url !== undefined ? demo_url : undefined,
    },
    include: { tasks: true },
  });

  // Recalculate progress based on tasks
  if (updated.tasks.length > 0) {
    const doneTasks = updated.tasks.filter((t: any) => t.status === 'done').length;
    const progress = Math.round((doneTasks / updated.tasks.length) * 100);
    await prisma.project.update({ where: { id }, data: { progress_percent: progress } });
    (updated as any).progress_percent = progress;
  }

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/projects/:id
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = await getDefaultUserId();

  const existing = await prisma.project.findFirst({ where: { id, user_id: userId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  await prisma.project.delete({ where: { id } }); // Cascade deletes ProjectTasks
  res.json({ success: true, message: 'Project deleted' });
});

// --- ProjectTask Sub-routes ---

// POST /api/v1/projects/:projectId/tasks
export const createProjectTask = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = await getDefaultUserId();

  const project = await prisma.project.findFirst({ where: { id: projectId, user_id: userId } });
  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ success: false, error: 'Title is required' });
    return;
  }

  const task = await prisma.projectTask.create({
    data: {
      project_id: projectId,
      title: title.trim(),
    },
  });

  // Recalculate progress
  await recalcProjectProgress(projectId);

  res.status(201).json({ success: true, data: task });
});

// PATCH /api/v1/projects/:projectId/tasks/:taskId
export const updateProjectTask = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;

  const existing = await prisma.projectTask.findFirst({ where: { id: taskId, project_id: projectId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Project task not found' });
    return;
  }

  const { title, status } = req.body;

  const updated = await prisma.projectTask.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(status !== undefined && { status }),
    },
  });

  // Recalculate progress
  await recalcProjectProgress(projectId);

  res.json({ success: true, data: updated });
});

// DELETE /api/v1/projects/:projectId/tasks/:taskId
export const deleteProjectTask = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, taskId } = req.params;

  const existing = await prisma.projectTask.findFirst({ where: { id: taskId, project_id: projectId } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Project task not found' });
    return;
  }

  await prisma.projectTask.delete({ where: { id: taskId } });

  // Recalculate progress
  await recalcProjectProgress(projectId);

  res.json({ success: true, message: 'Project task deleted' });
});

// Helper: recalculate project progress
async function recalcProjectProgress(projectId: string) {
  const tasks = await prisma.projectTask.findMany({ where: { project_id: projectId } });
  const progress = tasks.length > 0
    ? Math.round((tasks.filter((t: any) => t.status === 'done').length / tasks.length) * 100)
    : 0;
  await prisma.project.update({ where: { id: projectId }, data: { progress_percent: progress } });
}
