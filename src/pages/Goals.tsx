import { useState, useEffect } from 'react';
import { goalApi } from '../api';
import { useNavigate } from 'react-router-dom';

// Define data types
interface Milestone {
  id: string;
  title: string;
  status: 'DONE' | 'ACTIVE' | 'TODO';
  dateOrXP?: string;
}

interface Goal {
  id: string;
  category: string;
  categoryId: string; // 'career', 'competition', 'skills', 'education', 'personal'
  categoryIcon: string;
  categoryColorClass: string;
  statusText: string;
  targetText: string;
  targetDateISO: string;
  targetColorClass?: string;
  title: string;
  description: string;
  xpValue?: string;
  progressPercent: number;
  progressText: string;
  progressGradientClass: string;
  milestones: Milestone[];
  connections: { text: string; icon: string; colorClass: string }[];
  footerActionText: string;
  footerStatusText?: string;
  isWide?: boolean;
}

const mapBackendGoalToFrontend = (bg: any): Goal => {
  const cat = (bg.category || '').toLowerCase();
  let categoryId = 'personal';
  if (cat.includes('career')) categoryId = 'career';
  else if (cat.includes('competition')) categoryId = 'competition';
  else if (cat.includes('skill')) categoryId = 'skills';
  else if (cat.includes('education')) categoryId = 'education';

  let categoryIcon = 'self_improvement';
  let categoryColorClass = 'bg-surface-container-high text-tertiary-fixed-dim';
  let progressGradientClass = 'from-tertiary-fixed-dim to-surface-container-highest';
  
  if (categoryId === 'career') { categoryIcon = 'lan'; categoryColorClass = 'bg-secondary-container/30 text-secondary'; progressGradientClass = 'from-secondary to-secondary-fixed'; }
  else if (categoryId === 'competition') { categoryIcon = 'trophy'; categoryColorClass = 'bg-tertiary-container/30 text-tertiary'; progressGradientClass = 'from-tertiary to-tertiary-fixed'; }
  else if (categoryId === 'skills') { categoryIcon = 'smart_toy'; categoryColorClass = 'bg-primary-container/30 text-primary'; progressGradientClass = 'from-primary to-primary-fixed'; }
  else if (categoryId === 'education') { categoryIcon = 'school'; categoryColorClass = 'bg-secondary-container/20 text-secondary'; progressGradientClass = 'from-secondary-fixed to-secondary'; }

  let descriptionText = bg.description || '';
  let milestones: Milestone[] = Array.isArray(bg.milestones) ? bg.milestones : [];

  // Determine active milestone to highlight
  let foundActive = false;
  milestones = milestones.map(m => {
    if (m.status === 'DONE') return m;
    if (!foundActive) {
      foundActive = true;
      return { ...m, status: 'ACTIVE' }; // Auto set first non-done to ACTIVE
    }
    return { ...m, status: 'TODO' };
  });

  return {
    id: bg.id,
    category: bg.category || 'Personal',
    categoryId,
    categoryIcon,
    categoryColorClass,
    statusText: bg.status === 'completed' ? 'Achieved' : (bg.status === 'paused' ? 'Paused' : 'Active'),
    targetText: bg.target_date ? new Date(bg.target_date).toLocaleDateString() : (bg.deadline ? new Date(bg.deadline).toLocaleDateString() : 'No Deadline'),
    targetDateISO: bg.target_date ? new Date(bg.target_date).toISOString().split('T')[0] : (bg.deadline ? new Date(bg.deadline).toISOString().split('T')[0] : ''),
    targetColorClass: (bg.target_date || bg.deadline) && new Date(bg.target_date || bg.deadline) < new Date() && bg.status !== 'completed' ? 'bg-error-container/20 text-error' : '',
    title: bg.title,
    description: descriptionText,
    progressPercent: bg.progress_percentage || 0,
    progressText: `${bg.progress_percentage || 0}%`,
    progressGradientClass,
    milestones,
    connections: [],
    footerActionText: 'Lihat Detail',
    footerStatusText: bg.status,
    isWide: false
  };
};

const Goals = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'Semua Goals', icon: 'apps', hoverColor: 'text-primary' },
    { id: 'career', label: 'Career & Architecture', icon: 'lan', hoverColor: 'text-secondary' },
    { id: 'competition', label: 'Competitions', icon: 'trophy', hoverColor: 'text-tertiary' },
    { id: 'skills', label: 'Skills & AI', icon: 'smart_toy', hoverColor: 'text-primary' },
    { id: 'education', label: 'Education', icon: 'school', hoverColor: 'text-secondary-fixed' },
    { id: 'personal', label: 'Personal Development', icon: 'self_improvement', hoverColor: 'text-tertiary-fixed-dim' }
  ];

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formGoal, setFormGoal] = useState<{
    title: string;
    category: string;
    status: string;
    deadline: string;
    description: string;
    milestones: { id: string; title: string; status: 'DONE' | 'ACTIVE' | 'TODO' }[];
  }>({
    title: '',
    category: 'career',
    status: 'active',
    deadline: '',
    description: '',
    milestones: [{ id: Date.now().toString(), title: '', status: 'TODO' }]
  });

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const res = await goalApi.getAll();
      setGoals(res.data.map(mapBackendGoalToFrontend));
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const filteredGoals = activeCategory === 'all' 
    ? goals 
    : goals.filter(g => g.categoryId === activeCategory);

  const toggleMilestoneStatus = async (goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    let updatedMilestones = goal.milestones.map(m => {
      if (m.id === milestoneId) {
        return { ...m, status: (m.status === 'DONE' ? 'TODO' : 'DONE') as 'DONE' | 'ACTIVE' | 'TODO' };
      }
      return m;
    });

    const doneCount = updatedMilestones.filter(m => m.status === 'DONE').length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : goal.progressPercent;

    // Reset ACTIVE state
    let foundActive = false;
    updatedMilestones = updatedMilestones.map(m => {
      if (m.status === 'DONE') return m;
      if (!foundActive) {
        foundActive = true;
        return { ...m, status: 'ACTIVE' as const };
      }
      return { ...m, status: 'TODO' as const };
    });

    // Optimistic Update
    setGoals(prevGoals => prevGoals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          milestones: updatedMilestones,
          progressPercent: newProgress,
          progressText: `${newProgress}%`
        };
      }
      return g;
    }));

    try {
      let payloadStatus = goal.statusText === 'Achieved' ? 'completed' : (goal.statusText === 'Paused' ? 'paused' : 'active');
      if (newProgress === 100) payloadStatus = 'completed';

      await goalApi.update(goalId, {
        milestones: updatedMilestones,
        progress_percentage: newProgress,
        status: payloadStatus
      });
    } catch (err) {
      console.error(err);
      fetchGoals();
    }
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setFormGoal({
      title: goal.title,
      category: goal.categoryId,
      status: goal.statusText === 'Achieved' ? 'completed' : (goal.statusText === 'Paused' ? 'paused' : 'active'),
      deadline: goal.targetDateISO,
      description: goal.description,
      milestones: goal.milestones.length > 0 ? goal.milestones : [{ id: Date.now().toString(), title: '', status: 'TODO' }]
    });
    setIsModalOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!formGoal.title) return;
    
    setIsLoading(true);
    try {
      const validMilestones = formGoal.milestones.filter(m => m.title.trim() !== '');
      const catLabel = categories.find(c => c.id === formGoal.category)?.label || 'General';

      if (editingGoalId) {
        await goalApi.update(editingGoalId, {
          title: formGoal.title,
          description: formGoal.description,
          deadline: formGoal.deadline ? new Date(formGoal.deadline).toISOString() : null,
          target_date: formGoal.deadline ? new Date(formGoal.deadline).toISOString() : null,
          category: catLabel,
          status: formGoal.status,
          milestones: validMilestones
        });
      } else {
        await goalApi.create({
          title: formGoal.title,
          description: formGoal.description,
          deadline: formGoal.deadline ? new Date(formGoal.deadline).toISOString() : undefined,
          target_date: formGoal.deadline ? new Date(formGoal.deadline).toISOString() : undefined,
          category: catLabel,
          milestones: validMilestones
        });
      }

      setIsModalOpen(false);
      setEditingGoalId(null);
      setFormGoal({
        title: '',
        category: 'career',
        status: 'active',
        deadline: '',
        description: '',
        milestones: [{ id: Date.now().toString(), title: '', status: 'TODO' }]
      });
      fetchGoals();
    } catch (err) {
      console.error('Error creating goal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus goal ini?')) return;
    try {
      await goalApi.delete(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const handleAddMilestoneInput = () => {
    setFormGoal(prev => ({
      ...prev,
      milestones: [...prev.milestones, { id: Date.now().toString(), title: '', status: 'TODO' }]
    }));
  };

  // Telemetry Calculations
  const q4Goals = goals.filter(g => g.targetText.includes('2026') || g.targetText.includes('2027'));
  const averageVelocity = goals.length > 0 ? Math.round(goals.reduce((acc, curr) => acc + curr.progressPercent, 0) / goals.length) : 0;
  
  let totalMilestones = 0;
  let clearedMilestones = 0;
  goals.forEach(g => {
    g.milestones.forEach(m => {
      totalMilestones++;
      if (m.status === 'DONE') clearedMilestones++;
    });
  });
  const overallMilestoneRate = totalMilestones > 0 ? Math.round((clearedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-on-surface-variant animate-pulse">Memuat goals...</p>
          </div>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
            <span className="material-symbols-outlined text-[14px]">track_changes</span>
            <span>Goals Command Deck</span>
            <span className="text-outline/40">/</span>
            <span>Strategic Vision & Milestones</span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-bold">2026—2027 Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Goals & Life Vision Architecture
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed">
            Transformasi aspirasi jangka panjang menjadi roadmap milestone terukur, terdistribusi ke dalam sprint harian, telemetry keahlian, dan proyek nyata.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative inline-flex">
            <select 
              value={activeCategory} 
              onChange={(e) => setActiveCategory(e.target.value)}
              className="px-4 py-2.5 pl-9 rounded-xl bg-surface-container-low border border-neutral-800/50 text-on-surface text-xs sm:text-sm font-medium hover:bg-surface-container transition-colors appearance-none cursor-pointer outline-none"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">tune</span>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">expand_more</span>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Buat Goal Baru</span>
          </button>
        </div>
      </div>

      {/* Telemetry High-Speed Ribbon (4 Pods Bento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Total Goals</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">flag</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{goals.length}</span>
            <span className="text-xs text-secondary font-semibold">Aktif</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>{goals.length === 0 ? 'Belum ada goal yang aktif' : 'Goals terdistribusi'}</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Target Q4 2026/2027</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
            </div>
          </div>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{q4Goals.length}</span>
            <span className="text-xs text-tertiary font-semibold">Sasaran Krusial</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>Deadline Jangka Panjang</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Average Velocity</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">speed</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">
              {averageVelocity}%
            </span>
            <span className="text-xs text-secondary font-semibold">On-Track</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full" style={{ width: `${averageVelocity}%` }}></div>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Milestones Cleared</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{clearedMilestones}</span>
            <span className="text-sm text-outline font-normal">/ {totalMilestones}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-normal">
            <span>Completion Rate</span>
            <span className="text-secondary font-semibold">{overallMilestoneRate}%</span>
          </div>
        </div>
      </div>
      
      {/* Category Filter Segmented Rails */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeCategory === cat.id 
                ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${activeCategory === cat.id ? '' : cat.hoverColor}`}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
      
      {/* Main Strategic Roadmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {filteredGoals.map((goal) => (
          <div key={goal.id} className={`${goal.isWide ? 'lg:col-span-12 flex-col xl:flex-row' : 'lg:col-span-6 flex-col'} rounded-2xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6 hover:border-neutral-700/60 transition-all duration-200 relative overflow-hidden flex gap-5`}>
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${goal.categoryColorClass}`}>
                    <span className="material-symbols-outlined text-[14px]">{goal.categoryIcon}</span>
                    {goal.category}
                  </span>
                  {goal.statusText && (
                    <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant text-xs font-medium flex items-center gap-1.5 border border-neutral-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      {goal.statusText}
                    </span>
                  )}
                  {goal.targetText && (
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-neutral-800/40 ${goal.targetColorClass || 'bg-surface-container text-on-surface-variant'}`}>
                      <span className={`material-symbols-outlined text-[14px] ${goal.targetColorClass ? '' : 'text-outline'}`}>{goal.targetColorClass?.includes('error') ? 'alarm' : goal.categoryId === 'education' ? 'calendar_today' : 'schedule'}</span>
                      {goal.targetText}
                    </span>
                  )}
                  <button 
                    onClick={() => openEditModal(goal)}
                    className="ml-auto mr-1 w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-colors cursor-pointer"
                    title="Edit Goal"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                    title="Hapus Goal"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
                
                <h2 className="text-xl font-bold text-on-surface tracking-tight mb-2">
                  {goal.title}
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4 whitespace-pre-wrap font-normal">
                  {goal.description}
                </p>
                
                {goal.isWide && goal.connections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-surface-container mb-4">
                    <span className="text-xs text-outline uppercase tracking-wider font-semibold">Terkoneksi:</span>
                    {goal.connections.map((conn, cIdx) => (
                      <div key={cIdx} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${conn.colorClass}`}>
                        <span className="material-symbols-outlined text-[15px]">{conn.icon}</span>
                        <span>{conn.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {!goal.isWide && goal.connections.length > 0 && (
                  <div className="flex items-center gap-1.5 p-2 rounded bg-surface-container text-primary text-xs font-medium mb-4">
                    <span className="material-symbols-outlined text-[16px]">{goal.connections[0].icon}</span>
                    <span>{goal.connections[0].text}</span>
                  </div>
                )}
              </div>
              
              <div className={`space-y-1.5 ${goal.isWide ? 'mt-2' : 'mb-4'}`}>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-on-surface-variant">{goal.categoryId === 'education' ? 'SKS & Thesis Completion' : goal.categoryId === 'personal' ? 'Disiplin Harian' : 'Roadmap Velocity'}</span>
                  <span className={`font-bold font-sans ${goal.categoryId === 'career' ? 'text-secondary' : goal.categoryId === 'competition' ? 'text-tertiary' : goal.categoryId === 'skills' ? 'text-primary' : goal.categoryId === 'education' ? 'text-secondary' : 'text-tertiary-fixed-dim'}`}>
                    {goal.progressText}
                  </span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${goal.progressGradientClass}`} style={{ width: `${goal.progressPercent}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className={`relative z-10 w-full ${goal.isWide ? 'xl:w-[480px]' : ''} bg-surface-container/60 border border-neutral-800/40 p-4 rounded-xl flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-3 pb-1 border-b border-neutral-800/30">
                  <div className="text-xs text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">format_list_bulleted</span>
                    <span>Roadmap Milestones</span>
                  </div>
                  <span className="text-[11px] text-outline font-normal">Klik untuk update</span>
                </div>
                
                <div className="space-y-1.5">
                  {goal.milestones.length > 0 ? goal.milestones.map(milestone => {
                    const isDone = milestone.status === 'DONE';
                    const isActive = milestone.status === 'ACTIVE';
                    
                    let activeColorClass = 'text-primary';
                    let activeBgClass = 'bg-primary-container/20';
                    
                    if (goal.categoryId === 'career') { activeColorClass = 'text-secondary'; activeBgClass = 'bg-surface-container-high/80'; }
                    else if (goal.categoryId === 'competition') { activeColorClass = 'text-tertiary'; activeBgClass = 'bg-surface-container-high'; }
                    else if (goal.categoryId === 'education') { activeColorClass = 'text-secondary'; activeBgClass = 'bg-surface-container-high'; }
                    else if (goal.categoryId === 'personal') { activeColorClass = 'text-tertiary-fixed-dim'; activeBgClass = 'bg-surface-container-high'; }
                    
                    return (
                      <div 
                        key={milestone.id} 
                        onClick={() => toggleMilestoneStatus(goal.id, milestone.id)}
                        className={`milestone-row p-2 rounded-lg flex items-start gap-2.5 cursor-pointer transition-colors ${
                          isDone ? 'hover:bg-surface-container-high/60 bg-surface-container/30' : 
                          isActive ? activeBgClass : 
                          'hover:bg-surface-container-high/60 bg-surface-container/20'
                        }`}
                      >
                        {isActive && goal.categoryId === 'career' ? (
                          <div className="relative flex-shrink-0 mt-1">
                            <span className="w-3 h-3 rounded-full bg-secondary block"></span>
                          </div>
                        ) : (
                          <span className={`milestone-icon material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5 transition-colors ${
                            isDone ? 'text-secondary' : 
                            isActive ? activeColorClass : 
                            'text-outline'
                          }`} style={{ fontVariationSettings: isDone ? "'FILL' 1" : undefined }}>
                            {isDone ? 'check_circle' : isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className={`milestone-text text-xs sm:text-sm font-normal transition-all ${
                            isDone ? 'text-on-surface line-through text-outline opacity-60' : 
                            isActive ? `${activeColorClass} font-semibold` : 
                            'text-on-surface font-medium'
                          }`}>
                            {milestone.title}
                          </div>
                          
                          {milestone.dateOrXP && (
                            <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${isActive ? 'text-on-surface-variant font-medium' : 'text-outline font-normal'}`}>
                              {isActive && <span className={`material-symbols-outlined text-[12px] ${activeColorClass}`}>play_arrow</span>}
                              <span>{milestone.dateOrXP}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-4 text-outline text-xs font-normal">
                      Tidak ada milestone
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`mt-3 pt-2 border-t border-neutral-800/30 flex items-center justify-between text-xs font-medium ${goal.isWide ? 'text-on-surface-variant' : ''}`}>
                <span className={!goal.isWide && goal.categoryId === 'competition' ? 'text-tertiary font-semibold' : 'text-on-surface-variant font-normal'}>
                  {goal.footerStatusText}
                </span>
                {!goal.isWide ? (
                  <button onClick={() => navigate('/tasks')} className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                    goal.categoryId === 'competition' ? 'bg-tertiary-container/30 text-tertiary hover:bg-tertiary hover:text-on-tertiary' :
                    goal.categoryId === 'skills' ? 'bg-surface-container text-primary hover:bg-primary hover:text-on-primary' :
                    goal.categoryId === 'education' ? 'bg-surface-container text-on-surface hover:bg-surface-container-high' :
                    'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}>
                    <span>{goal.footerActionText}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                ) : (
                  <button onClick={() => navigate('/tasks')} className="text-primary hover:text-primary-fixed flex items-center gap-0.5 font-semibold">
                    <span>{goal.footerActionText}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredGoals.length === 0 && !isLoading && (
          <div className="lg:col-span-12 py-12 text-center flex flex-col items-center justify-center bg-surface-container/30 border border-neutral-800/50 rounded-2xl">
            <span className="material-symbols-outlined text-outline/60 text-[36px] mb-2">flag</span>
            <p className="text-xs text-outline font-medium">Belum ada goal di kategori ini.</p>
          </div>
        )}
      </div>
      
      {/* The Compound Trajectory Banner */}
      <section className="rounded-2xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">route</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-primary font-bold tracking-widest uppercase">The Compound Trajectory</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              Sasaran besar dipecah menjadi milestone mingguan, ditranslasikan menjadi tiket task harian.
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant font-normal leading-relaxed">
              Setiap 1 jam Deep Focus dan centang task harian otomatis menggeser kalkulasi persentase pencapaian roadmap ini secara real-time.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 flex-shrink-0">
          <button 
            onClick={() => navigate('/tasks')} 
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 text-secondary text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span>Buka Hubungan Goals ke Tasks</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* CREATE GOAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] border border-neutral-800/50">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              {editingGoalId ? 'Edit Goal / Vision' : 'Create New Goal / Life Vision Target'}
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Judul Goal / Sasaran Utama</label>
                  <input 
                    value={formGoal.title} 
                    onChange={e => setFormGoal({...formGoal, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. Menang ICPC / Sertifikasi CKA" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Kategori</label>
                  <select 
                    value={formGoal.category} 
                    onChange={e => setFormGoal({...formGoal, category: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Target Deadline (Optional)</label>
                  <input 
                    type="date"
                    value={formGoal.deadline} 
                    onChange={e => setFormGoal({...formGoal, deadline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Deskripsi & Metrik Target (Key Results)</label>
                <textarea 
                  value={formGoal.description} 
                  onChange={e => setFormGoal({...formGoal, description: e.target.value})} 
                  className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none" 
                  rows={3} 
                  placeholder="Deskripsi..."
                ></textarea>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline">Milestones Awal</label>
                  <button onClick={handleAddMilestoneInput} className="text-primary text-xs font-semibold hover:text-primary-fixed cursor-pointer">+ Tambah Milestone</button>
                </div>
                <div className="space-y-2">
                  {formGoal.milestones.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest text-outline flex items-center justify-center text-xs font-semibold flex-shrink-0">{idx + 1}</div>
                      <input 
                        value={m.title}
                        onChange={e => {
                          const newM = [...formGoal.milestones];
                          newM[idx].title = e.target.value;
                          setFormGoal({...formGoal, milestones: newM});
                        }}
                        className="flex-1 bg-surface-container text-on-surface text-sm px-3 py-2 rounded-lg border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Mis. Phase 1: ..."
                      />
                      <button onClick={() => {
                        const newM = [...formGoal.milestones];
                        newM.splice(idx, 1);
                        setFormGoal({...formGoal, milestones: newM});
                      }} className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-neutral-800/50">
              <button onClick={() => { setIsModalOpen(false); setEditingGoalId(null); }} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">Batal</button>
              <button onClick={handleSaveGoal} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors border border-purple-500/30 flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">save</span> {editingGoalId ? 'Update Goal' : 'Simpan Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
