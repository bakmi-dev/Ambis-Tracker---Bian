import { Router } from 'express';
import { register, login, googleAuth, completeOnboarding } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/complete-onboarding', authenticateJWT, completeOnboarding);

export default router;
