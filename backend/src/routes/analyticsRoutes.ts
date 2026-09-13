import { Router } from 'express';
import { getDashboardSummary } from '../controllers/analyticsController';

const router = Router();

router.get('/summary', getDashboardSummary);

export default router;
