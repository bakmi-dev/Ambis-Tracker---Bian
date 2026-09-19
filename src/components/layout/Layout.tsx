import React, { type ReactNode } from 'react';
import { useGlobalState } from '../../context/GlobalContext';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../modals/CommandPalette';
import AudioModal from '../modals/AudioModal';
import SettingsModal from '../modals/SettingsModal';
import AiChatPanel from '../modals/AiChatPanel';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isPlayingBinaural, binauralVolume } = useGlobalState();
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = binauralVolume;
      if (isPlayingBinaural) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingBinaural, binauralVolume]);

  return (
    <>
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/water/rain_on_roof.ogg" loop />
      <Sidebar />
      <AiChatPanel />
      <div className="pl-72 flex flex-col min-h-screen">
        <Header />
        <main className="relative flex-1 pt-16 w-full px-space-lg py-space-lg bg-surface">
          {children}
        </main>
      </div>
      
      {/* Global Modals */}
      <CommandPalette />
      <AudioModal />
      <SettingsModal />
    </>
  );
};

export default Layout;

