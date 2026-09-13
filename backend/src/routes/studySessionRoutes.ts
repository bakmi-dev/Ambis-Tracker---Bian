import { Router } from 'express';
import { getStudySessions, createStudySession, deleteStudySession } from '../controllers/studySessionController';

const router = Router();

router.get('/', getStudySessions);
router.post('/', createStudySession);
router.delete('/:id', deleteStudySession);

export default router;
