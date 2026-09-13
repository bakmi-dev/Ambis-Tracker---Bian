import { Router } from 'express';
import { getLearningMaterials, createLearningMaterial, updateLearningMaterial, deleteLearningMaterial } from '../controllers/learningController';

const router = Router();

router.get('/', getLearningMaterials);
router.post('/', createLearningMaterial);
router.patch('/:id', updateLearningMaterial);
router.delete('/:id', deleteLearningMaterial);

export default router;
