import { Router } from 'express';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../controllers/journalController';

const router = Router();

router.get('/', getJournalEntries);
router.post('/', createJournalEntry);
router.patch('/:id', updateJournalEntry);
router.delete('/:id', deleteJournalEntry);

export default router;
