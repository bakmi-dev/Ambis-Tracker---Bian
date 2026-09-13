import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import Layout from './components/layout/Layout';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
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
import { useGlobalState } from './context/GlobalContext';
import { GlobalProvider } from './context/GlobalContext';

// Fade transition wrapper for smooth page transitions
const FadeTransition = ({ children }: { children: ReactNode }) => {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (children !== displayChildren) {
      setTransitionStage('exit');
    }
  }, [children, displayChildren]);

  return (
    <div
      className={`transition-opacity duration-300 ease-in-out ${
        transitionStage === 'enter' ? 'opacity-100' : 'opacity-0'
      }`}
      onTransitionEnd={() => {
        if (transitionStage === 'exit') {
          setDisplayChildren(children);
          setTransitionStage('enter');
        }
      }}
    >
      {displayChildren}
    </div>
  );
};

// Protect dashboard routes: redirect to /register if not onboarded
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useGlobalState();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user && !user.is_onboarded) return <Navigate to="/register" />;
  return <FadeTransition>{children}</FadeTransition>;
};

const DocumentTitleUpdater = () => {
  const { user } = useGlobalState();
  useEffect(() => {
    document.title = `Ambis Tracker ${user?.name ? `[${user.name}]` : ''}`.trim();
  }, [user?.name]);
  return null;
};

// Inner app with routing
const AppRoutes = () => {
  const location = useLocation();
  const isPublicPage = ['/', '/login', '/register', '/onboarding'].includes(location.pathname);
  if (isPublicPage) {
    return (
      <FadeTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Register />} />
        </Routes>
      </FadeTransition>
    );
  }

  return (
    <Layout>
      <ProtectedRoute>
        <FadeTransition key="app">
          <Routes location={location}>
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
        </FadeTransition>
      </ProtectedRoute>
    </Layout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <GlobalProvider>
        <DocumentTitleUpdater />
        <AppRoutes />
      </GlobalProvider>
    </BrowserRouter>
  );
}

export default App;
