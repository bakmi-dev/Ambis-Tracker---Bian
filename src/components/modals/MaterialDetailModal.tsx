import { useState } from 'react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import type { LearningPath } from '../../pages/StudySpace';
import { learningApi } from '../../api';

interface MaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: LearningPath | null;
  onUpdate: () => void;
}

const MaterialDetailModal = ({ isOpen, onClose, path, onUpdate }: MaterialDetailModalProps) => {
  const { startTimer } = useFocusTimer();
  const [newTopic, setNewTopic] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !path) return null;

  const handleStartFocus = () => {
    // Start the timer directly for 45 minutes targeting this topic
    startTimer(45, path.title);
    onClose();
  };

  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    setIsUpdating(true);
    try {
      // Find the original learning material first to get the URL
      const { data } = await learningApi.getAll();
      const material = data.find((m: any) => m.id === path.id);
      if (!material) return;

      const payload = JSON.parse(material.url || '{}');
      let milestones = payload.milestones || path.milestones;
      
      const newStatus = currentStatus === 'DONE' ? 'ACTIVE' : 'DONE';
      milestones = milestones.map((m: any) => m.id === milestoneId ? { ...m, status: newStatus } : m);
      
      payload.milestones = milestones;
      
      const completedCount = milestones.filter((m: any) => m.status === 'DONE').length;
      const progressPercent = Math.round((completedCount / milestones.length) * 100);
      const dbStatus = progressPercent === 100 ? 'completed' : 'in_progress';

      await learningApi.update(path.id, {
        url: JSON.stringify(payload),
        status: dbStatus
      });
      
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setIsUpdating(true);
    try {
      const { data } = await learningApi.getAll();
      const material = data.find((m: any) => m.id === path.id);
      if (!material) return;

      const payload = JSON.parse(material.url || '{}');
      let milestones = payload.milestones || path.milestones;
      
      milestones.push({
        id: Date.now().toString(),
        title: newTopic,
        status: 'TODO'
      });
      
      payload.milestones = milestones;
      
      const completedCount = milestones.filter((m: any) => m.status === 'DONE').length;
      const progressPercent = Math.round((completedCount / milestones.length) * 100);
      const dbStatus = progressPercent === 100 ? 'completed' : 'in_progress';

      await learningApi.update(path.id, {
        url: JSON.stringify(payload),
        status: dbStatus
      });
      
      setNewTopic('');
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-space-md border-b border-surface-container-highest flex items-start justify-between bg-surface-container-low">
          <div>
            <span className={`inline-block px-2.5 py-0.5 rounded font-label-sm text-label-sm font-semibold uppercase tracking-wider mb-2 ${path.categoryColorClass}`}>
              {path.category}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
              {path.title}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/80 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-space-md space-y-space-md">
          {/* Progress Overview */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-highest">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">Progress Keseluruhan</span>
              <span className={`font-label-md text-label-md font-bold ${path.progressColorClass}`}>{path.progressPercent}% DONE</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
              <div className={`h-full bg-gradient-to-r rounded-full ${path.bgGradientClass} transition-all duration-500`} style={{ width: `${path.progressPercent}%` }}></div>
            </div>
          </div>

          <button 
            onClick={handleStartFocus}
            className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-body-sm text-body-sm font-semibold transition-all shadow-md active:scale-95 ${path.progressColorClass.replace('text-', 'bg-')} text-white`}
          >
            <span className="material-symbols-outlined text-[20px]">timer</span>
            <span>Mulai Belajar Topik Ini (45 Menit)</span>
          </button>

          {/* Checklist */}
          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-bold mb-3 uppercase tracking-wider">Milestone Checklist</h3>
            <div className="space-y-2">
              {path.milestones.map(milestone => (
                <div key={milestone.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${milestone.status === 'DONE' ? 'bg-surface-container-lowest border-surface-container-highest' : 'bg-surface-container-low border-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleMilestone(milestone.id, milestone.status)}
                      disabled={isUpdating}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${milestone.status === 'DONE' ? path.progressColorClass.replace('text-', 'bg-') + ' text-white' : 'bg-surface-container-highest text-transparent hover:bg-outline/20'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <div>
                      <span className={`font-body-sm text-body-sm block ${milestone.status === 'DONE' ? 'text-on-surface-variant line-through' : 'text-on-surface font-medium'}`}>
                        {milestone.title}
                      </span>
                      {milestone.statusText && (
                        <span className="font-label-sm text-label-sm text-outline">{milestone.statusText}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded uppercase font-semibold ${milestone.status === 'DONE' ? 'bg-surface-container-highest text-on-surface-variant' : milestone.status === 'ACTIVE' ? path.progressColorClass.replace('text-', 'bg-') + '/20 ' + path.progressColorClass : 'bg-surface-container-highest text-outline'}`}>
                        {milestone.status}
                     </span>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddMilestone} className="mt-3 relative">
              <input 
                type="text" 
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="+ Tambah sub-topik baru..."
                className="w-full h-11 pl-4 pr-10 rounded-xl bg-surface-container-lowest border border-surface-container-highest text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:border-primary transition-colors"
                disabled={isUpdating}
              />
              <button type="submit" disabled={!newTopic.trim() || isUpdating} className="absolute right-2 top-1.5 w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetailModal;
