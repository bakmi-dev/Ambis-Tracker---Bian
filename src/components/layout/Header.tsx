import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusTimer } from '../../context/FocusTimerContext';
import { useGlobalState } from '../../context/GlobalContext';

const Header = () => {
  const { 
    setIsCommandPaletteOpen, 
    setIsSettingsModalOpen
  } = useGlobalState();
  const {
    isActive: isFocusActive,
    isPaused: isFocusPaused,
    formatTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setCustomDuration
  } = useFocusTimer();
  const navigate = useNavigate();


  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTimerPopoverOpen, setIsTimerPopoverOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (timerRef.current && !timerRef.current.contains(event.target as Node)) {
        setIsTimerPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl z-40 border-b border-white/5">
      <div className="h-16 w-full px-space-lg flex items-center justify-between gap-space-md">
        <div className="flex-1 max-w-xl">
          <div 
            className="relative flex items-center cursor-pointer group"
            onClick={() => setIsCommandPaletteOpen(true)}
          >
            <span className="material-symbols-outlined absolute left-space-md text-outline group-hover:text-primary transition-colors text-[18px]">search</span>
            <input 
              className="w-full h-10 pl-10 pr-16 bg-surface-container-low border border-white/5 text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-xl focus:outline-none focus:border-primary/50 transition-colors cursor-pointer group-hover:border-white/10" 
              placeholder="Search actions, tasks, notes..." 
              readOnly 
              type="text" 
            />
            <kbd className="absolute right-space-md px-1.5 py-0.5 rounded bg-surface-container border border-white/10 text-on-surface-variant font-label-sm text-label-sm font-semibold pointer-events-none">⌘K</kbd>
          </div>
        </div>
        
        <div className="flex items-center gap-space-md">
          {isFocusActive && (
            <div className="relative" ref={timerRef}>
              <button 
                onClick={() => setIsTimerPopoverOpen(!isTimerPopoverOpen)}
                className={`hidden xl:flex items-center gap-space-xs px-space-md py-1 rounded-full font-label-md text-label-md font-semibold tracking-wide transition-all ${isFocusPaused ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-secondary-container/20 text-secondary shadow-[0_0_12px_rgba(76,215,246,0.2)] hover:bg-secondary-container/30'}`}
              >
                <span className={`w-2 h-2 rounded-full ${isFocusPaused ? 'bg-outline' : 'bg-secondary animate-pulse'}`}></span>
                <span>{isFocusPaused ? 'FOCUS PAUSED' : 'DEEP FOCUS ACTIVE'} {formatTimer()}</span>
              </button>

              {isTimerPopoverOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container border border-surface-container-highest rounded-xl shadow-xl p-3 z-50">
                  <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2 text-center">Edit Durasi</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[25, 45, 60, 90].map(mins => (
                      <button 
                        key={mins}
                        onClick={() => { setCustomDuration(mins); setIsTimerPopoverOpen(false); }}
                        className="py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm font-semibold transition-colors"
                      >
                        {mins} Min
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { isFocusPaused ? resumeTimer() : pauseTimer(); setIsTimerPopoverOpen(false); }}
                      className="flex-1 py-1.5 rounded-lg bg-surface-container-highest hover:bg-outline/20 text-on-surface font-label-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">{isFocusPaused ? 'play_arrow' : 'pause'}</span>
                      {isFocusPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      onClick={() => { stopTimer(); setIsTimerPopoverOpen(false); }}
                      className="flex-1 py-1.5 rounded-lg bg-error-container/20 hover:bg-error-container/40 text-error font-label-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">stop</span>
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-space-xs">
            <button className="relative w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tertiary shadow-[0_0_6px_rgba(255,176,205,0.8)]"></span>
            </button>
            
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-8 h-8 rounded-full bg-primary hover:brightness-110 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-xl overflow-hidden py-1">
                  <button 
                    onClick={() => { navigate('/progress'); setIsProfileOpen(false); }}
                    className="w-full px-4 py-2 text-left font-body-sm text-on-surface hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">account_circle</span>
                    Lihat Profil
                  </button>
                  <button 
                    onClick={() => { !isFocusActive ? setCustomDuration(45) : null; navigate('/today#focus-sprint-section'); setIsProfileOpen(false); }}
                    className="w-full px-4 py-2 text-left font-body-sm text-on-surface hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">center_focus_strong</span>
                    Mode Fokus
                  </button>
                  <div className="border-t border-surface-container-highest my-1"></div>
                  <button 
                    onClick={() => { setIsSettingsModalOpen(true); setIsProfileOpen(false); }}
                    className="w-full px-4 py-2 text-left font-body-sm text-on-surface hover:bg-surface-container-high flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">settings</span>
                    Pengaturan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
