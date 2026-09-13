import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'grid_view' },
  { label: 'Today', path: '/today', icon: 'today' },
  { label: 'Tasks', path: '/tasks', icon: 'check_box' },
  { label: 'Study Space', path: '/study-space', icon: 'school' },
  { label: 'Goals', path: '/goals', icon: 'flag' },
  { label: 'Projects', path: '/projects', icon: 'terminal' },
  { label: 'Competitions', path: '/competitions', icon: 'trophy' },
  { label: 'Progress', path: '/progress', icon: 'monitoring' },
  { label: 'Journal', path: '/journal', icon: 'edit_note' },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: 'menu_book' }
];

const CommandPalette = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useGlobalState();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filtered = NAV_ITEMS.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-32 bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-low w-full max-w-xl rounded-2xl shadow-2xl border border-surface-container-highest overflow-hidden flex flex-col">
        <div className="relative flex items-center p-4 border-b border-surface-container-highest">
          <span className="material-symbols-outlined text-outline text-[24px] absolute left-6">search</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="text"
            className="w-full h-12 pl-12 pr-4 bg-surface-container text-on-surface placeholder:text-outline font-body-lg text-body-lg rounded-xl focus:outline-none focus:bg-surface-container-high transition-colors"
            placeholder="Type a command or search..."
          />
          <button onClick={() => setIsCommandPaletteOpen(false)} className="absolute right-6 text-outline hover:text-on-surface">
            <kbd className="px-2 py-1 rounded bg-surface-container-high font-mono text-xs">ESC</kbd>
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length > 0 ? filtered.map((item) => (
            <button
              key={item.path}
              onClick={() => handleSelect(item.path)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-container-high transition-colors text-left group"
            >
              <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">{item.icon}</span>
              <span className="font-body-md text-on-surface font-semibold">{item.label}</span>
              <span className="ml-auto font-label-sm text-outline opacity-0 group-hover:opacity-100 transition-opacity">Jump to ↵</span>
            </button>
          )) : (
            <div className="p-8 text-center text-outline font-body-md">No commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
