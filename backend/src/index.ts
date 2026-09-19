import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorMiddleware';
import { initDb } from './scripts/initDb';

// Route imports
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import studySessionRoutes from './routes/studySessionRoutes';
import goalRoutes from './routes/goalRoutes';
import competitionRoutes from './routes/competitionRoutes';
import projectRoutes from './routes/projectRoutes';
import journalRoutes from './routes/journalRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import learningRoutes from './routes/learningRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import profileRoutes from './routes/profileRoutes';
import ritualRoutes from './routes/ritualRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Tables
initDb();

// Health check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Ambis Tracker Backend is running!' });
});

// API Routes
app.use('/api/v1/auth', authRoutes); // Auth routes
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/study-sessions', studySessionRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/competitions', competitionRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/journal', journalRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/learning', learningRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/rituals', ritualRoutes);

// Error handler (must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Ambis Tracker] Server running on http://localhost:${PORT}`);
    console.log(`[Ambis Tracker] API base: http://localhost:${PORT}/api/v1`);
  });
}

export default app;
