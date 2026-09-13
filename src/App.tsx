import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Today from './pages/Today';
import Tasks from './pages/Tasks';
import StudySpace from './pages/StudySpace';
import Goals from './pages/Goals';
import Competitions from './pages/Competitions';
import Projects from './pages/Projects';
import Progress from './pages/Progress';
import Journal from './pages/Journal';
import KnowledgeBase from './pages/KnowledgeBase';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/today" element={<Today />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/study-space" element={<StudySpace />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
