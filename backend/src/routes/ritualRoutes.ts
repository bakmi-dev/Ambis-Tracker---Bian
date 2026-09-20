import { Router } from 'express';
import { getRituals, createRitual, updateRitual, toggleRitual, deleteRitual } from '../controllers/ritualController';

const router = Router();

router.get('/', getRituals);
router.post('/', createRitual);
router.patch('/:id/toggle', toggleRitual);
router.patch('/:id', updateRitual);
router.delete('/:id', deleteRitual);

export default router;
