import { Router } from 'express';
import { getLearningMaterials, createLearningMaterial, updateLearningMaterial, deleteLearningMaterial } from '../controllers/learningController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.get('/', authenticateJWT, getLearningMaterials);
router.post('/', authenticateJWT, createLearningMaterial);
router.patch('/:id', authenticateJWT, updateLearningMaterial);
router.delete('/:id', authenticateJWT, deleteLearningMaterial);

export default router;
