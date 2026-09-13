import { useGlobalState } from '../../context/GlobalContext';

const SettingsModal = () => {
  const { user, isSettingsModalOpen, setIsSettingsModalOpen } = useGlobalState();

  if (!isSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low w-full max-w-md rounded-3xl shadow-2xl border border-surface-container-highest overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-surface-container-highest">
          <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings</span>
            System Settings
          </h2>
          <button onClick={() => setIsSettingsModalOpen(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block font-label-sm text-outline mb-1">Display Name</label>
              <input type="text" defaultValue={user?.name || 'Operator'} className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface font-body-sm" />
            </div>
            <div>
              <label className="block font-label-sm text-outline mb-1">Theme</label>
              <select className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface font-body-sm appearance-none">
                <option>Cyberpunk Dark (Default)</option>
                <option>System Match</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-container-highest flex items-center justify-between">
            <div>
              <h4 className="font-label-md text-on-surface font-bold">Local Cache</h4>
              <p className="font-body-sm text-on-surface-variant">Reset UI preferences and states.</p>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 rounded-xl bg-error/10 text-error font-label-md font-bold hover:bg-error/20 transition-colors">
              Reset Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
