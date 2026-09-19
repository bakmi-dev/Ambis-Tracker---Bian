import { Router } from 'express';
import { getStudySessions, createStudySession, deleteStudySession } from '../controllers/studySessionController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT); // Protect all routes in this file

router.get('/', getStudySessions);
router.post('/', createStudySession);
router.delete('/:id', deleteStudySession);

export default router;
