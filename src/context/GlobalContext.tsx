import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type AudioMode = 'spotify' | 'binaural';
type WorkspaceType = string;

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role_track?: string;
  workspace_name?: string;
  focus_target_hours?: number;
  is_onboarded?: boolean;
  bio?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  location?: string;
  xp?: number;
  current_streak?: number;
}

interface GlobalContextType {
  // Auth State
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;

  // Timer State (Moved to FocusTimerContext)
  
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
  isAiChatOpen: boolean;
  setIsAiChatOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
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
    window.location.href = '/login';
  };

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
    (localStorage.getItem('activeWorkspace') as WorkspaceType) || "My Command Deck"
  );

  // Modals State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('ambis:unauthorized', handleUnauthorized as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ambis:unauthorized', handleUnauthorized as EventListener);
    };
  }, []);

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
        setIsSettingsModalOpen,
        isAiChatOpen,
        setIsAiChatOpen
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
