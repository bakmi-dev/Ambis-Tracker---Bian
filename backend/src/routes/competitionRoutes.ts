import { Router } from 'express';
import { getCompetitions, createCompetition, updateCompetition, deleteCompetition } from '../controllers/competitionController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', getCompetitions);
router.post('/', createCompetition);
router.patch('/:id', updateCompetition);
router.delete('/:id', deleteCompetition);

export default router;
