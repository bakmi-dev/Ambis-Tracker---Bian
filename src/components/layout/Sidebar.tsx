import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useGlobalState } from "../../context/GlobalContext";
import Avatar from "../common/Avatar";

const navClasses = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "flex items-center gap-space-sm px-space-md py-space-sm transition-all bg-primary-container text-on-primary-container font-semibold rounded-lg shadow-[0_0_20px_rgba(160,120,255,0.35)]"
    : "flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all";

const Sidebar = () => {
  const navigate = useNavigate();
  const { 
    user,
    activeWorkspace, 
    setActiveWorkspace,
    audioMode,
    isPlayingBinaural,
    toggleBinaural,
    setIsAudioModalOpen,
    setIsSettingsModalOpen
  } = useGlobalState();

  const WORKSPACES = [
    user?.workspace_name || "My Command Deck",
    "Academic & College Vault",
    "Hackathon Prep Space"
  ];

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setIsWorkspaceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-space-lg pb-space-sm">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-[0_0_16px_rgba(208,188,255,0.25)]">
                <span className="material-symbols-outlined text-[20px]">
                  neurology
                </span>
              </div>
              <div>
                <span className="font-headline-md text-headline-md tracking-tight font-bold text-on-surface leading-none block">
                  Ambis Tracker
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-secondary font-semibold tracking-wider uppercase shadow-[0_0_8px_rgba(76,215,246,0.2)]">
              V3.2
            </span>
          </div>

          <div className="relative mt-space-md" ref={workspaceRef}>
            <button 
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="w-full px-space-md py-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface flex items-center justify-between text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.6)]"></span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-on-surface uppercase tracking-wider">
                    Workspace
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                    {activeWorkspace}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface text-[18px] flex-shrink-0">
                unfold_more
              </span>
            </button>

            {isWorkspaceOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-surface-container-low border border-surface-container-highest rounded-xl shadow-xl overflow-hidden py-1 z-50">
                {WORKSPACES.map(ws => (
                  <button 
                    key={ws}
                    onClick={() => { setActiveWorkspace(ws); setIsWorkspaceOpen(false); }}
                    className="w-full px-4 py-2 text-left font-body-sm flex items-center justify-between transition-colors hover:bg-surface-container-high"
                  >
                    <span className={activeWorkspace === ws ? 'text-primary font-semibold' : 'text-on-surface'}>{ws}</span>
                    {activeWorkspace === ws && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-md custom-scrollbar">
          <nav>
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">
              Main
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
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">
              Development
            </div>
            <div className="mt-space-xs space-y-0.5">
              <NavLink to="/study-space" className={navClasses}>
                <span className="material-symbols-outlined text-[20px]">school</span>
                <span>Study Space</span>
              </NavLink>
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
            <div className="px-space-sm py-space-xs font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">
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
          <div className="p-space-sm rounded-xl bg-surface-container-low shadow-[0_0_12px_rgba(76,215,246,0.06)] border border-transparent hover:border-surface-container-highest transition-colors">
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
                  className="w-7 h-7 flex-shrink-0 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors shadow-[0_0_10px_rgba(76,215,246,0.35)]"
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
