import { Router } from 'express';
import { getKnowledgeDocs, getKnowledgeDoc, createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc } from '../controllers/knowledgeController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', getKnowledgeDocs);
router.get('/:id', getKnowledgeDoc);
router.post('/', createKnowledgeDoc);
router.patch('/:id', updateKnowledgeDoc);
router.delete('/:id', deleteKnowledgeDoc);

export default router;
