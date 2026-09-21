import { Router } from 'express';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../controllers/journalController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
router.use(authenticateJWT);

router.get('/', getJournalEntries);
router.post('/', createJournalEntry);
router.patch('/:id', updateJournalEntry);
router.delete('/:id', deleteJournalEntry);

export default router;
