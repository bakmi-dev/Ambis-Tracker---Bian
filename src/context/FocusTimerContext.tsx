import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type TimerMode = 'deep_focus' | 'short_break';

interface FocusTimerContextType {
  isActive: boolean;
  isPaused: boolean;
  timeLeft: number;
  initialDuration: number; // in minutes
  currentTopic: string;
  mode: TimerMode;
  
  startTimer: (durationMinutes?: number, topic?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  setCustomDuration: (minutes: number) => void;
  formatTimer: () => string;
  endSession: () => void;
  
  // Pending Session State for Auto-Fill
  pendingSession: { duration: number; topic: string } | null;
  clearPendingSession: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextType | undefined>(undefined);

export const FocusTimerProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('ft_isActive') === 'true';
  });
  
  const [isPaused, setIsPaused] = useState(() => {
    return localStorage.getItem('ft_isPaused') === 'true';
  });
  
  const [initialDuration, setInitialDuration] = useState(() => {
    return parseInt(localStorage.getItem('ft_initialDuration') || '45', 10);
  });
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('ft_timeLeft');
    return saved ? parseInt(saved, 10) : 45 * 60;
  });
  
  const [currentTopic, setCurrentTopic] = useState(() => {
    return localStorage.getItem('ft_currentTopic') || '';
  });
  
  const mode: TimerMode = 'deep_focus';

  // Pending Session State
  const [pendingSession, setPendingSession] = useState<{ duration: number; topic: string } | null>(() => {
    const saved = localStorage.getItem('ft_pendingSession');
    return saved ? JSON.parse(saved) : null;
  });

  const clearPendingSession = () => {
    setPendingSession(null);
    localStorage.removeItem('ft_pendingSession');
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ft_isActive', isActive.toString());
    localStorage.setItem('ft_isPaused', isPaused.toString());
    localStorage.setItem('ft_initialDuration', initialDuration.toString());
    localStorage.setItem('ft_timeLeft', timeLeft.toString());
    localStorage.setItem('ft_currentTopic', currentTopic);
    if (pendingSession) {
      localStorage.setItem('ft_pendingSession', JSON.stringify(pendingSession));
    } else {
      localStorage.removeItem('ft_pendingSession');
    }
  }, [isActive, isPaused, initialDuration, timeLeft, currentTopic, pendingSession]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && isActive) {
      setIsActive(false);
      endSession();
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft]);

  const startTimer = (durationMinutes?: number, topic?: string) => {
    if (durationMinutes) {
      setInitialDuration(durationMinutes);
      setTimeLeft(durationMinutes * 60);
    } else if (timeLeft === 0 || timeLeft === initialDuration * 60) {
      setTimeLeft(initialDuration * 60);
    }
    if (topic !== undefined) setCurrentTopic(topic);
    setIsActive(true);
    setIsPaused(false);
  };

  const pauseTimer = () => setIsPaused(true);
  const resumeTimer = () => setIsPaused(false);
  
  const stopTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    const durationFinishedInSeconds = (initialDuration * 60) - timeLeft;
    if (durationFinishedInSeconds >= 60) {
      // If they finished at least 1 minute, save pending session
      setPendingSession({ duration: Math.floor(durationFinishedInSeconds / 60), topic: currentTopic });
    }
    setTimeLeft(initialDuration * 60);
  };

  const setCustomDuration = (minutes: number) => {
    setInitialDuration(minutes);
    setTimeLeft(minutes * 60);
  };

  const endSession = () => {
    // Called when timer reaches 0
    setIsActive(false);
    setIsPaused(false);
    setPendingSession({ duration: initialDuration, topic: currentTopic });
  };

  const formatTimer = () => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <FocusTimerContext.Provider
      value={{
        isActive,
        isPaused,
        timeLeft,
        initialDuration,
        currentTopic,
        mode,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        setCustomDuration,
        formatTimer,
        endSession,
        pendingSession,
        clearPendingSession
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
};

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext);
  if (context === undefined) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
};
