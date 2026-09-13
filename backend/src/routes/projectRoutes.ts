import { Router } from 'express';
import {
  getProjects, createProject, updateProject, deleteProject,
  createProjectTask, updateProjectTask, deleteProjectTask
} from '../controllers/projectController';

const router = Router();

router.get('/', getProjects);
router.post('/', createProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

// Nested ProjectTask routes
router.post('/:projectId/tasks', createProjectTask);
router.patch('/:projectId/tasks/:taskId', updateProjectTask);
router.delete('/:projectId/tasks/:taskId', deleteProjectTask);

export default router;
