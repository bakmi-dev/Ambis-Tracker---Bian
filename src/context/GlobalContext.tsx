import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type AudioMode = 'spotify' | 'binaural';
type WorkspaceType = "Bian's Command Deck" | "Academic & College Vault" | "Hackathon Prep Space";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role_track?: string;
  workspace_name?: string;
  focus_target_hours?: number;
  is_onboarded?: boolean;
}

interface GlobalContextType {
  // Auth State
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;

  // Timer State
  isFocusActive: boolean;
  isFocusPaused: boolean;
  focusSeconds: number;
  toggleTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  formatTimer: () => string;
  
  // Audio & Spotify State
  isAudioModalOpen: boolean;
  setIsAudioModalOpen: (val: boolean) => void;
  audioMode: AudioMode;
  setAudioMode: (val: AudioMode) => void;
  spotifyEmbedUrl: string;
  setSpotifyEmbedUrl: (val: string) => void;
  isPlayingBinaural: boolean;
  toggleBinaural: () => void;
  binauralVolume: number;
  setBinauralVolume: (val: number) => void;

  // Workspace State
  activeWorkspace: WorkspaceType;
  setActiveWorkspace: (val: WorkspaceType) => void;

  // Modals State
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (val: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (val: boolean) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // Auth State
  const [user, setUserState] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('ambis_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem('ambis_token') || null;
  });

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('ambis_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('ambis_user');
    }
  };

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('ambis_token', newToken);
    } else {
      localStorage.removeItem('ambis_token');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  // Timer State
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(45 * 60);

  // Audio State
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>('binaural');
  const [spotifyEmbedUrl, setSpotifyEmbedUrlState] = useState(
    localStorage.getItem('spotifyEmbedUrl') || 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn'
  );
  const [isPlayingBinaural, setIsPlayingBinaural] = useState(false);
  const [binauralVolume, setBinauralVolume] = useState(0.5);

  // Workspace State
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>(
    (localStorage.getItem('activeWorkspace') as WorkspaceType) || "Bian's Command Deck"
  );

  // Modals State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isFocusActive && !isFocusPaused && focusSeconds > 0) {
      interval = setInterval(() => {
        setFocusSeconds((prev) => prev - 1);
      }, 1000);
    } else if (focusSeconds === 0 && isFocusActive) {
      setIsFocusActive(false);
      // Here you could add a toast/notification
    }
    return () => clearInterval(interval);
  }, [isFocusActive, isFocusPaused, focusSeconds]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTimer = () => {
    if (!isFocusActive) {
      setIsFocusActive(true);
      setIsFocusPaused(false);
      if (focusSeconds === 0) setFocusSeconds(45 * 60);
    } else {
      setIsFocusPaused(!isFocusPaused);
    }
  };

  const stopTimer = () => {
    setIsFocusActive(false);
    setIsFocusPaused(false);
    setFocusSeconds(45 * 60);
  };

  const pauseTimer = () => {
    setIsFocusPaused(true);
  };

  const formatTimer = () => {
    const m = Math.floor(focusSeconds / 60).toString().padStart(2, '0');
    const s = (focusSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const parseSpotifyUrl = (url: string) => {
    if (url.includes('/embed/')) return url;
    if (url.includes('spotify.com/')) {
      const parts = url.split('spotify.com/');
      return `https://open.spotify.com/embed/${parts[1].split('?')[0]}`;
    }
    return url;
  };

  const setSpotifyEmbedUrl = (url: string) => {
    const embedUrl = parseSpotifyUrl(url);
    setSpotifyEmbedUrlState(embedUrl);
    localStorage.setItem('spotifyEmbedUrl', embedUrl);
  };

  const toggleBinaural = () => {
    setIsPlayingBinaural(!isPlayingBinaural);
    if (!isPlayingBinaural) {
      setAudioMode('binaural');
    }
  };

  const setActiveWorkspace = (val: WorkspaceType) => {
    setActiveWorkspaceState(val);
    localStorage.setItem('activeWorkspace', val);
  };

  return (
    <GlobalContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        isAuthenticated: !!token,
        logout,
        isFocusActive,
        isFocusPaused,
        focusSeconds,
        toggleTimer,
        stopTimer,
        pauseTimer,
        formatTimer,
        isAudioModalOpen,
        setIsAudioModalOpen,
        audioMode,
        setAudioMode,
        spotifyEmbedUrl,
        setSpotifyEmbedUrl,
        isPlayingBinaural,
        toggleBinaural,
        binauralVolume,
        setBinauralVolume,
        activeWorkspace,
        setActiveWorkspace,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalProvider');
  }
  return context;
};
