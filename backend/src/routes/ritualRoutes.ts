import { Router } from 'express';
import { getRituals, createRitual, toggleRitual, deleteRitual } from '../controllers/ritualController';

const router = Router();

router.get('/', getRituals);
router.post('/', createRitual);
router.patch('/:id/toggle', toggleRitual);
router.delete('/:id', deleteRitual);

export default router;
