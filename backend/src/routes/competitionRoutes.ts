import { Router } from 'express';
import { getCompetitions, createCompetition, updateCompetition, deleteCompetition } from '../controllers/competitionController';

const router = Router();

router.get('/', getCompetitions);
router.post('/', createCompetition);
router.patch('/:id', updateCompetition);
router.delete('/:id', deleteCompetition);

export default router;
