import { Router } from 'express';
import { getKnowledgeDocs, getKnowledgeDoc, createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc } from '../controllers/knowledgeController';

const router = Router();

router.get('/', getKnowledgeDocs);
router.get('/:id', getKnowledgeDoc);
router.post('/', createKnowledgeDoc);
router.patch('/:id', updateKnowledgeDoc);
router.delete('/:id', deleteKnowledgeDoc);

export default router;
