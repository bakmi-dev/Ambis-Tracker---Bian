import { Router } from 'express';
import { getDashboardSummary } from '../controllers/analyticsController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/summary', getDashboardSummary);

export default router;
