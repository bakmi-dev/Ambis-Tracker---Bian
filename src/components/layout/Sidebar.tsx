import { NavLink, useNavigate } from "react-router-dom";
import { useGlobalState } from "../../context/GlobalContext";
import Avatar from "../common/Avatar";

const navClasses = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "flex items-center gap-space-sm px-space-md py-space-sm transition-all bg-purple-600 text-white font-semibold rounded-lg border border-purple-500/40"
    : "flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent transition-all";

const Sidebar = () => {
  const navigate = useNavigate();
  const {
    user,
    audioMode,
    isPlayingBinaural,
    toggleBinaural,
    setIsAudioModalOpen,
    setIsSettingsModalOpen,
    isAiChatOpen,
    setIsAiChatOpen
  } = useGlobalState();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-white/5">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-space-lg pb-space-sm">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <img src="/logo.png" alt="Ambis Tracker Logo" className="w-8 h-8 object-contain rounded-lg" />
              <div>
                <span className="font-headline-md text-headline-md tracking-tight font-bold text-on-surface leading-none block">
                  Ambis Tracker
                </span>
              </div>
            </div>
          </div>

          {/* AI Assistant Shortcut Button */}
          <div className="mt-space-md">
            <button
              onClick={() => setIsAiChatOpen(prev => !prev)}
              className={`w-full px-space-md py-2.5 rounded-lg flex items-center justify-between text-left transition-all border group cursor-pointer ${isAiChatOpen
                ? 'bg-purple-950/40 border-purple-500/50 text-white'
                : 'bg-surface-container-low hover:bg-surface-container border-white/5 hover:border-neutral-700/60 text-on-surface'
                }`}
              title="Buka / Tutup Ambis AI Assistant"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${isAiChatOpen
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-surface-container group-hover:bg-purple-600/20 text-purple-400 border border-neutral-700/60 group-hover:border-purple-500/40'
                  }`}>
                  <span className="material-symbols-outlined text-[19px]">smart_toy</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[10px] font-bold text-purple-400 group-hover:text-purple-300 uppercase tracking-widest leading-tight">
                    AI ASSISTANT
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                    Ask Ambis AI
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isAiChatOpen ? 'rotate-90 text-purple-400' : 'text-on-surface-variant group-hover:text-on-surface'
                  }`}>
                  chevron_right
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-md custom-scrollbar">
          <nav>
            <div className="px-space-sm py-space-xs font-mono text-[11px] font-bold tracking-widest text-outline uppercase">
              Overview
            </div>
            <div className="mt-space-xs space-y-0.5">
              <NavLink to="/dashboard" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/today" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">today</span>
                <span>Today</span>
              </NavLink>
              <NavLink to="/tasks" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">check_box</span>
                <span>Tasks</span>
              </NavLink>
            </div>
          </nav>

          <nav>
            <div className="px-space-sm py-space-xs font-mono text-[11px] font-bold tracking-widest text-outline uppercase">
              Ambitions
            </div>
            <div className="mt-space-xs space-y-0.5">
              <NavLink to="/goals" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">flag</span>
                <span>Goals</span>
              </NavLink>
              <NavLink to="/competitions" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">trophy</span>
                <span>Competitions</span>
              </NavLink>
              <NavLink to="/projects" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">terminal</span>
                <span>Projects</span>
              </NavLink>
            </div>
          </nav>

          <nav>
            <div className="px-space-sm py-space-xs font-mono text-[11px] font-bold tracking-widest text-outline uppercase">
              Knowledge
            </div>
            <div className="mt-space-xs space-y-0.5">
              <NavLink to="/progress" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">monitoring</span>
                <span>Progress</span>
              </NavLink>
              <NavLink to="/journal" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                <span>Journal</span>
              </NavLink>
              <NavLink to="/knowledge-base" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                <span>Knowledge Base</span>
              </NavLink>
            </div>
          </nav>
        </div>

        <div className="p-space-md space-y-space-sm bg-surface-container-lowest">
          <div className="p-space-sm rounded-xl bg-surface-container-low border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="flex items-center justify-between mb-space-xs cursor-pointer" onClick={() => setIsAudioModalOpen(true)}>
              <div className="flex items-center gap-space-xs">
                <span className={`material-symbols-outlined text-[16px] ${audioMode === 'spotify' ? 'text-primary' : 'text-secondary'}`}>
                  {audioMode === 'spotify' ? 'queue_music' : 'graphic_eq'}
                </span>
                <span className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${audioMode === 'spotify' ? 'text-primary' : 'text-secondary'}`}>
                  {audioMode === 'spotify' ? 'Spotify Sync' : 'Audio Focus'}
                </span>
              </div>
              <span className="material-symbols-outlined text-[14px] text-outline">open_in_new</span>
            </div>
            <div className="flex items-center justify-between gap-space-sm">
              <div className="truncate min-w-0" onClick={() => setIsAudioModalOpen(true)}>
                <div className="font-body-sm text-body-sm font-medium text-on-surface truncate cursor-pointer hover:underline">
                  {audioMode === 'spotify' ? 'Lo-Fi Focus Playlist' : 'Deep Alpha State'}
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {audioMode === 'spotify' ? 'Spotify Embed' : 'Binaural Entrainment'}
                </div>
              </div>
              {audioMode === 'binaural' && (
                <button
                  onClick={toggleBinaural}
                  className="w-7 h-7 flex-shrink-0 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors border border-secondary/40"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPlayingBinaural ? "pause" : "play_arrow"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
            <div className="flex items-center gap-space-sm min-w-0 cursor-pointer" onClick={() => navigate('/progress')}>
              <div className="relative flex-shrink-0">
                <Avatar src={user?.avatar_url} name={user?.name} size="sm" className="w-9 h-9 text-[12px]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold flex items-center justify-center ring-2 ring-surface-container-low">
                  42
                </span>
              </div>
              <div className="flex flex-col truncate min-w-0">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate group-hover:underline">
                  {user?.name || 'Operator'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {user?.role_track || 'Level 4 Scholar'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                settings
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
