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
  let milestones: Milestone[] = [];
  
  try {
    const parsed = JSON.parse(bg.description || '{}');
    if (parsed && parsed.isJSONGoalDesc) {
      descriptionText = parsed.text || '';
      milestones = parsed.milestones || [];
    }
  } catch (e) {
    // Normal string
  }

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
    statusText: bg.status === 'completed' ? 'Completed' : 'Active',
    targetText: bg.deadline ? new Date(bg.deadline).toLocaleDateString() : 'No Deadline',
    targetColorClass: bg.deadline && new Date(bg.deadline) < new Date() ? 'bg-error-container/20 text-error' : '',
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
    { id: 'all', label: 'Semua Goals', icon: 'apps', defaultColor: 'bg-primary text-on-primary shadow-md', hoverColor: 'bg-primary text-on-primary shadow-md' },
    { id: 'career', label: 'Career & Architecture', icon: 'lan', defaultColor: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface', hoverColor: 'text-secondary' },
    { id: 'competition', label: 'Competitions', icon: 'trophy', defaultColor: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface', hoverColor: 'text-tertiary' },
    { id: 'skills', label: 'Skills & AI', icon: 'smart_toy', defaultColor: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface', hoverColor: 'text-primary' },
    { id: 'education', label: 'Education', icon: 'school', defaultColor: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface', hoverColor: 'text-secondary-fixed' },
    { id: 'personal', label: 'Personal Development', icon: 'self_improvement', defaultColor: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface', hoverColor: 'text-tertiary-fixed-dim' }
  ];

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formGoal, setFormGoal] = useState({
    title: '',
    category: 'career',
    deadline: '',
    description: '',
    milestones: [{ id: Date.now().toString(), title: '', status: 'TODO' as const }]
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

    const updatedDescStr = JSON.stringify({
      isJSONGoalDesc: true,
      text: goal.description,
      milestones: updatedMilestones
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
      await goalApi.update(goalId, {
        description: updatedDescStr,
        progress_percentage: newProgress
      });
    } catch (err) {
      console.error(err);
      fetchGoals();
    }
  };

  const handleCreateGoal = async () => {
    if (!formGoal.title) return;
    
    setIsLoading(true);
    try {
      const validMilestones = formGoal.milestones.filter(m => m.title.trim() !== '');
      
      const payloadDesc = JSON.stringify({
        isJSONGoalDesc: true,
        text: formGoal.description,
        milestones: validMilestones
      });

      const catLabel = categories.find(c => c.id === formGoal.category)?.label || 'General';

      await goalApi.create({
        title: formGoal.title,
        description: payloadDesc,
        deadline: formGoal.deadline ? new Date(formGoal.deadline).toISOString() : undefined,
        category: catLabel,
      });

      setIsModalOpen(false);
      setFormGoal({
        title: '',
        category: 'career',
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
    <div className="flex flex-col w-full">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="font-body-md text-on-surface-variant animate-pulse">Memuat goals...</p>
          </div>
        </div>
      )}
      {/* Ambient Top Glow Vector */}
      <div className="relative w-full overflow-hidden pb-space-lg">
        <div className="absolute -top-24 right-10 w-96 h-96 rounded-full bg-primary/10 blur-[90px] pointer-events-none"></div>
        <div className="absolute top-10 left-1/3 w-80 h-80 rounded-full bg-secondary/10 blur-[80px] pointer-events-none"></div>
        
        {/* Header & Breadcrumbs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-space-lg relative z-10">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">
              <span className="material-symbols-outlined text-[14px]">track_changes</span>
              <span>Goals Command Deck</span>
              <span className="text-outline">/</span>
              <span>Strategic Vision & Milestones</span>
              <span className="text-outline">/</span>
              <span className="text-primary-fixed-dim">2026—2027 Roadmap</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
              Goals & Life Vision Architecture
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl leading-relaxed">
              Transformasi aspirasi jangka panjang menjadi roadmap milestone terukur, terdistribusi ke dalam sprint harian, telemetry keahlian, dan proyek nyata.
            </p>
          </div>
          {/* Action Cluster */}
          <div className="flex items-center gap-space-sm flex-shrink-0">
            <div className="relative inline-flex">
              <select 
                value={activeCategory} 
                onChange={(e) => setActiveCategory(e.target.value)}
                className="px-space-md py-2.5 pl-9 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md shadow-sm appearance-none cursor-pointer outline-none"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary pointer-events-none">tune</span>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">expand_more</span>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-fixed transition-all duration-200 text-on-primary font-label-md text-label-md font-semibold flex items-center gap-space-xs shadow-[0_0_24px_rgba(208,188,255,0.35)] active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Buat Goal Baru</span>
            </button>
          </div>
        </div>

        {/* Telemetry High-Speed Ribbon (4 Pods Bento) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg relative z-10">
          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Total Goals</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </div>
            </div>
            <div className="my-space-xs flex items-baseline gap-space-xs">
              <span className="font-metric-display text-metric-display font-bold text-on-surface leading-none">{goals.length}</span>
              <span className="font-label-md text-label-md text-secondary font-semibold">Aktif</span>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>{goals.length === 0 ? 'Belum ada goal yang aktif' : 'Goals terdistribusi'}</span>
            </div>
          </div>
          
          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Target Q4 2026/2027</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
              </div>
            </div>
            <div className="my-space-xs flex items-baseline gap-space-xs">
              <span className="font-metric-display text-metric-display font-bold text-on-surface leading-none">{q4Goals.length}</span>
              <span className="font-label-md text-label-md text-tertiary font-semibold">Sasaran Krusial</span>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span>Deadline Jangka Panjang</span>
            </div>
          </div>
          
          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Average Velocity</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[18px]">speed</span>
              </div>
            </div>
            <div className="my-space-xs flex items-baseline gap-space-xs">
              <span className="font-metric-display text-metric-display font-bold text-on-surface leading-none">
                {averageVelocity}%
              </span>
              <span className="font-label-md text-label-md text-secondary font-semibold">On-Track</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full" style={{ width: `${averageVelocity}%` }}></div>
            </div>
          </div>
          
          <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Milestones Cleared</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
            </div>
            <div className="my-space-xs flex items-baseline gap-space-xs">
              <span className="font-metric-display text-metric-display font-bold text-on-surface leading-none">{clearedMilestones}</span>
              <span className="font-headline-md text-headline-md text-outline font-normal">/ {totalMilestones}</span>
            </div>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span>Completion Rate</span>
              <span className="text-secondary font-mono font-bold">{overallMilestoneRate}%</span>
            </div>
          </div>
        </div>
        
        {/* Category Filter Segmented Rails */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-sm mb-space-lg no-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-space-md py-2 rounded-xl font-label-sm text-label-sm font-semibold tracking-wide transition-all flex items-center gap-space-xs whitespace-nowrap ${activeCategory === cat.id ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className={`material-symbols-outlined text-[16px] ${activeCategory === cat.id ? '' : cat.hoverColor}`}>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        
        {/* Main Strategic Roadmap Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {filteredGoals.map((goal) => (
            <div key={goal.id} className={`${goal.isWide ? 'lg:col-span-12 flex-col xl:flex-row' : 'lg:col-span-6 flex-col'} goal-item-card rounded-xl bg-surface-container-low p-space-lg shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex gap-space-lg`}>
              {goal.isWide && (
                <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/10 via-transparent to-transparent pointer-events-none"></div>
              )}
              
              <div className={`relative z-10 flex-1 flex flex-col ${!goal.isWide ? 'justify-between' : 'justify-between'}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-space-xs mb-space-sm">
                    <span className={`px-2.5 py-1 rounded font-label-sm text-label-sm font-bold tracking-wider uppercase flex items-center gap-1 ${goal.categoryColorClass}`}>
                      <span className="material-symbols-outlined text-[14px]">{goal.categoryIcon}</span>
                      {goal.category}
                    </span>
                    {goal.statusText && (
                      <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        {goal.statusText}
                      </span>
                    )}
                    {goal.targetText && (
                      <span className={`px-2.5 py-1 rounded font-label-sm text-label-sm flex items-center gap-1 ${goal.targetColorClass || 'bg-surface-container-high text-on-surface-variant'}`}>
                        <span className={`material-symbols-outlined text-[14px] ${goal.targetColorClass ? '' : 'text-outline'}`}>{goal.targetColorClass?.includes('error') ? 'alarm' : goal.categoryId === 'education' ? 'calendar_today' : 'schedule'}</span>
                        {goal.targetText}
                      </span>
                    )}
                    <button 
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Hapus Goal"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  
                  <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mb-space-xs">
                    {goal.title}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-md whitespace-pre-wrap">
                    {goal.description}
                  </p>
                  
                  {goal.isWide && goal.connections.length > 0 && (
                    <div className="flex flex-wrap items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest/70 mb-space-md">
                      <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Terkoneksi:</span>
                      {goal.connections.map((conn, cIdx) => (
                        <div key={cIdx} className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-body-sm text-body-sm ${conn.colorClass}`}>
                          <span className="material-symbols-outlined text-[15px]">{conn.icon}</span>
                          <span>{conn.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!goal.isWide && goal.connections.length > 0 && (
                    <div className="flex items-center gap-space-xs p-space-xs rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm mb-space-md">
                      <span className="material-symbols-outlined text-[16px]">{goal.connections[0].icon}</span>
                      <span>{goal.connections[0].text}</span>
                    </div>
                  )}
                  
                </div>
                
                <div className={`space-y-space-xs ${goal.isWide ? 'mt-space-sm' : 'mb-space-md'}`}>
                  <div className="flex items-center justify-between font-label-md text-label-md">
                    <span className="text-on-surface-variant">{goal.categoryId === 'education' ? 'SKS & Thesis Completion' : goal.categoryId === 'personal' ? 'Disiplin Harian' : 'Roadmap Velocity'}</span>
                    <span className={`font-bold font-mono ${goal.categoryId === 'career' ? 'text-secondary' : goal.categoryId === 'competition' ? 'text-tertiary' : goal.categoryId === 'skills' ? 'text-primary' : goal.categoryId === 'education' ? 'text-secondary' : 'text-tertiary-fixed-dim'}`}>
                      {goal.progressText}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-3 p-0.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${goal.progressGradientClass}`} style={{ width: `${goal.progressPercent}%` }}></div>
                  </div>
                </div>
              </div>
              
              <div className={`relative z-10 w-full ${goal.isWide ? 'xl:w-[480px] bg-surface-container p-space-md' : 'bg-surface-container p-space-sm'} rounded-xl flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between mb-space-sm pb-space-xs">
                    <div className="font-label-sm text-label-sm text-on-surface font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">format_list_bulleted</span>
                      <span>Roadmap Milestones</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">Klik untuk update</span>
                  </div>
                  
                  <div className="space-y-space-xs">
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
                          className={`milestone-row p-space-xs rounded-lg flex items-start gap-space-sm cursor-pointer transition-colors ${
                            isDone ? 'hover:bg-surface-container-high/60 bg-surface-container-highest/20' : 
                            isActive ? activeBgClass : 
                            'hover:bg-surface-container-high/60 bg-surface-container-lowest'
                          }`}
                        >
                          {isActive && goal.categoryId === 'career' ? (
                            <div className="relative flex-shrink-0 mt-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-secondary block shadow-[0_0_8px_rgba(76,215,246,0.9)] animate-pulse"></span>
                            </div>
                          ) : (
                            <span className={`milestone-icon material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5 transition-colors ${
                              isDone ? 'text-secondary' : 
                              isActive ? activeColorClass : 
                              'text-outline'
                            }`} style={{ fontVariationSettings: isDone ? "'FILL' 1" : undefined }}>
                              {isDone ? 'check_circle' : isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className={`milestone-text font-body-sm text-body-sm transition-all ${
                              isDone ? 'text-on-surface line-through text-outline font-medium opacity-60' : 
                              isActive ? `${activeColorClass} font-bold` : 
                              'text-on-surface font-medium'
                            }`}>
                              {milestone.title}
                            </div>
                            
                            {milestone.dateOrXP && (
                              <div className={`font-label-sm text-label-sm flex items-center gap-1 mt-0.5 ${isActive ? 'text-on-surface-variant' : 'text-outline'}`}>
                                {isActive && <span className={`material-symbols-outlined text-[13px] ${activeColorClass}`}>play_arrow</span>}
                                <span>{milestone.dateOrXP}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-4 text-outline font-label-sm">
                        Tidak ada milestone
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-label-sm ${goal.isWide ? 'text-on-surface-variant' : ''}`}>
                  <span className={!goal.isWide && goal.categoryId === 'competition' ? 'text-tertiary font-mono font-bold' : 'text-on-surface-variant'}>
                    {goal.footerStatusText}
                  </span>
                  {!goal.isWide ? (
                    <button onClick={() => navigate('/tasks')} className={`px-space-md py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
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
            <div className="lg:col-span-12 py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-lowest rounded-xl">
              <span className="material-symbols-outlined text-outline text-[48px]">flag</span>
              <p className="font-body-md text-outline">Belum ada goal di kategori ini.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* The Compound Trajectory */}
      <section className="rounded-2xl bg-surface-container p-space-lg shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-space-lg mt-space-lg">
        <div className="relative z-10 flex items-start gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">route</span>
          </div>
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className="font-label-sm text-label-sm text-primary-container uppercase font-bold tracking-widest">The Compound Trajectory</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-1 tracking-tight">
              Sasaran besar dipecah menjadi milestone mingguan, ditranslasikan menjadi tiket task harian.
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Setiap 1 jam Deep Focus dan centang task harian otomatis menggeser kalkulasi persentase pencapaian roadmap ini secara real-time.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 flex-shrink-0">
          <button onClick={() => navigate('/tasks')} className="px-space-lg py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary font-body-md text-body-md font-semibold transition-colors flex items-center gap-space-xs whitespace-nowrap shadow-sm">
            <span>Buka Hubungan Goals ke Tasks</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* CREATE GOAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="font-headline-md text-on-surface font-bold mb-4">Create New Goal / Life Vision Target</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Judul Goal / Sasaran Utama</label>
                  <input 
                    value={formGoal.title} 
                    onChange={e => setFormGoal({...formGoal, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. Menang ICPC / Sertifikasi CKA" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Kategori</label>
                  <select 
                    value={formGoal.category} 
                    onChange={e => setFormGoal({...formGoal, category: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                  >
                    {categories.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Target Deadline (Optional)</label>
                  <input 
                    type="date"
                    value={formGoal.deadline} 
                    onChange={e => setFormGoal({...formGoal, deadline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Deskripsi & Metrik Target (Key Results)</label>
                <textarea 
                  value={formGoal.description} 
                  onChange={e => setFormGoal({...formGoal, description: e.target.value})} 
                  className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-surface-container-highest" 
                  rows={3} 
                  placeholder="Deskripsi..."
                ></textarea>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-label-sm text-outline uppercase tracking-wider font-semibold">Milestones Awal</label>
                  <button onClick={handleAddMilestoneInput} className="text-primary font-label-sm text-label-sm font-semibold hover:text-primary-fixed">+ Tambah Milestone</button>
                </div>
                <div className="space-y-2">
                  {formGoal.milestones.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-label-sm flex-shrink-0">{idx + 1}</div>
                      <input 
                        value={m.title}
                        onChange={e => {
                          const newM = [...formGoal.milestones];
                          newM[idx].title = e.target.value;
                          setFormGoal({...formGoal, milestones: newM});
                        }}
                        className="flex-1 bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                        placeholder="Mis. Phase 1: ..."
                      />
                      <button onClick={() => {
                        const newM = [...formGoal.milestones];
                        newM.splice(idx, 1);
                        setFormGoal({...formGoal, milestones: newM});
                      }} className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-container-highest">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold">Batal</button>
              <button onClick={handleCreateGoal} className="px-5 py-2.5 rounded-xl font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span> Simpan Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
