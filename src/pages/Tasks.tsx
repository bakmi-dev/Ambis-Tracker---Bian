import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi } from '../api';

const Tasks = () => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useNavigate();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI States
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Tasks');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'Study Space',
    priority: 'medium',
    due_date: '',
    defaultStatus: 'todo' // 'todo' | 'in_progress'
  });

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await taskApi.getAll();
      setAllTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const handleSync = () => {
      fetchTasks();
    };
    window.addEventListener('ambis:tasks-updated', handleSync);
    return () => window.removeEventListener('ambis:tasks-updated', handleSync);
  }, []);

  // Actions
  const openEditModal = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'Study Space',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      defaultStatus: task.is_completed ? 'completed' : (task.tags?.includes('in_progress') ? 'in_progress' : 'todo')
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) return;
    try {
      const tags = taskForm.defaultStatus === 'in_progress' ? ['in_progress'] : [];
      
      if (editingTaskId) {
        // Edit mode
        await taskApi.update(editingTaskId, {
          title: taskForm.title,
          description: taskForm.description,
          category: taskForm.category,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          tags
        });
      } else {
        // Create mode
        await taskApi.create({
          title: taskForm.title,
          description: taskForm.description,
          category: taskForm.category,
          priority: taskForm.priority,
          due_date: taskForm.due_date || undefined,
          tags
        });
      }
      
      setIsTaskModalOpen(false);
      setEditingTaskId(null);
      setTaskForm({ title: '', description: '', category: 'Study Space', priority: 'medium', due_date: '', defaultStatus: 'todo' });
      window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTask = async (task: any, newStatus: 'todo' | 'in_progress' | 'completed') => {
    try {
      let is_completed = task.is_completed;
      let tags = task.tags || [];
      if (newStatus === 'completed') {
        is_completed = true;
      } else if (newStatus === 'in_progress') {
        is_completed = false;
        if (!tags.includes('in_progress')) tags.push('in_progress');
      } else {
        is_completed = false;
        tags = tags.filter((t: string) => t !== 'in_progress');
      }
      await taskApi.update(task.id, { is_completed, tags });
      window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent setting active task
    try {
      await taskApi.delete(id);
      if (activeTaskId === id) setActiveTaskId(null);
      window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Logic
  const filteredTasks = allTasks.filter(task => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q) && !(task.tags || []).join(' ').toLowerCase().includes(q)) {
        return false;
      }
    }
    // Tag filter
    if (activeFilter === 'High Priority' && task.priority !== 'high') return false;
    if (activeFilter === 'Study Space' && task.category !== 'Study Space') return false;
    if (activeFilter === 'Projects' && task.category !== 'Projects') return false;
    if (activeFilter === 'Competitions' && task.category !== 'Competitions') return false;
    return true;
  });

  const todoTasks = filteredTasks.filter(t => !t.is_completed && !t.tags?.includes('in_progress'));
  const inProgressTasks = filteredTasks.filter(t => !t.is_completed && t.tags?.includes('in_progress'));
  const completedTasks = filteredTasks.filter(t => t.is_completed);

  const activeTaskObj = allTasks.find(t => t.id === activeTaskId);

  // Render Helpers
  const renderCard = (task: any) => (
    <div key={task.id} onClick={() => setActiveTaskId(task.id)} className={`group relative flex flex-col p-space-md rounded-xl ${activeTaskId === task.id ? 'bg-surface-container-highest ring-1 ring-primary' : 'bg-surface-container hover:bg-surface-container-high'} transition-all shadow-sm cursor-pointer`}>
      <div className="flex items-center justify-between mb-space-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold bg-surface-container-lowest text-on-surface">
            {task.category || 'General'}
          </span>
          <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${task.priority === 'high' ? 'bg-error-container/30 text-error' : task.priority === 'medium' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 text-outline opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => openEditModal(e, task)} className="hover:text-primary transition-colors" title="Edit">
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
          <button onClick={(e) => handleDeleteTask(e, task.id)} className="hover:text-error transition-colors" title="Delete">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
      
      <h3 className={`font-body-md text-body-md font-bold transition-colors leading-snug ${task.is_completed ? 'text-on-surface-variant line-through' : 'text-on-surface group-hover:text-primary'}`}>
        {task.title}
      </h3>
      
      {task.description && (
        <p className="mt-space-xs text-on-surface-variant font-body-sm text-body-sm line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="mt-space-md pt-space-xs flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-2">
          {/* Status Select */}
          <select 
            className="bg-transparent border border-surface-container-highest rounded-md px-1 py-0.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            onClick={(e) => e.stopPropagation()}
            value={task.is_completed ? 'completed' : (task.tags?.includes('in_progress') ? 'in_progress' : 'todo')}
            onChange={(e) => {
              e.stopPropagation();
              handleMoveTask(task, e.target.value as any);
            }}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-outline">bolt</span>
            <span>+{task.xp || 10} XP</span>
          </div>
        </div>
        {task.due_date && (
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">event</span>
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant animate-pulse">Memuat tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {/* Command Header & View Switcher Bar */}
      <section className="flex flex-col gap-4">
        {/* Breadcrumb & Main Heading with Quick Primary Action */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
              <span className="material-symbols-outlined text-[14px]">checklist</span>
              <span>COMMAND DECK</span>
              <span className="text-outline/40">/</span>
              <span>TASKS & BACKLOG ENGINE</span>
              <span className="text-outline/40">/</span>
              <span className="text-primary font-bold">SPRINT #14</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight font-sans">
              Tasks & Backlog Engine
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed font-sans">
              Kelola alur eksekusi tugas harian, sprint proyek, dan persiapan kompetisi secara terstruktur.
            </p>
          </div>
          
          {/* Action Group & Overview Shortcuts */}
          <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-800/50"
              title="Buka Ringkasan Dashboard Overview"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">dashboard</span>
              <span>Dashboard Overview →</span>
            </button>
            <button
              onClick={() => navigate('/today')}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-800/50"
              title="Buka Jadwal Eksekusi Harian di Today"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">today</span>
              <span>Today's Command →</span>
            </button>
            <button 
              onClick={() => { setEditingTaskId(null); setTaskForm({...taskForm, title: '', description: '', due_date: '', defaultStatus: 'todo'}); setIsTaskModalOpen(true); }} 
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Buat Task Baru</span>
            </button>
          </div>
        </div>

        {/* OVERVIEW STATS TELEMETRY STRIP - INTER-LINKED */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: All Tasks */}
          <div 
            onClick={() => setActiveFilter('All Tasks')}
            className={`p-5 rounded-2xl bg-surface-container-low border transition-all flex flex-col justify-between shadow-none cursor-pointer group ${
              activeFilter === 'All Tasks' ? 'border-purple-500/60 bg-surface-container/60' : 'border-neutral-800/50 hover:border-purple-500/40 hover:bg-surface-container/40'
            }`}
            title="Tampilkan semua task backlog"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1">
                  SEMUA TASK
                  <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">filter_alt</span>
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">checklist</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                  {allTasks.length}
                </span>
                <span className="text-xs font-sans text-outline">Total</span>
              </div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{allTasks.length} tugas terdata</span>
              <span className="text-secondary font-sans text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">Filter →</span>
            </div>
          </div>

          {/* Stat 2: To Do */}
          <div 
            onClick={() => { setActiveView('kanban'); setActiveFilter('All Tasks'); }}
            className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none cursor-pointer group"
            title="Beralih ke kolom To Do di Kanban"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1">
                  TO DO
                  <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">view_column</span>
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-outline group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                  {todoTasks.length}
                </span>
                <span className="text-xs font-sans text-outline">Pending</span>
              </div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-outline rounded-full" style={{ width: `${allTasks.length > 0 ? (todoTasks.length / allTasks.length) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
              <span>Menunggu pengerjaan</span>
              <span className="text-outline font-sans text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">Kanban →</span>
            </div>
          </div>

          {/* Stat 3: In Progress */}
          <div 
            onClick={() => { setActiveView('kanban'); setActiveFilter('All Tasks'); }}
            className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none cursor-pointer group"
            title="Beralih ke kolom In Progress di Kanban"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1">
                  IN PROGRESS
                  <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">view_column</span>
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                  {inProgressTasks.length}
                </span>
                <span className="text-xs font-sans text-secondary font-semibold">Aktif</span>
              </div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${allTasks.length > 0 ? (inProgressTasks.length / allTasks.length) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
              <span>Sedang berlangsung</span>
              <span className="text-secondary font-sans text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">Kanban →</span>
            </div>
          </div>

          {/* Stat 4: Completed (Linked to Today & Kanban) */}
          <div 
            onClick={() => navigate('/today')}
            className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none cursor-pointer group"
            title="Buka laporan checklist di Today"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1">
                  TASK SELESAI
                  <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                  {completedTasks.length}
                </span>
                <span className="text-xs font-sans text-primary font-semibold">
                  {allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
              <span>Tuntas dieksekusi</span>
              <span className="text-primary font-sans text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">Today →</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-2 rounded-2xl bg-surface-container-low border border-neutral-800/50 shadow-none">
          {/* Switcher Segmented Control */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveView('kanban')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border ${
                activeView === 'kanban' 
                  ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span>
              <span>Kanban Board</span>
            </button>
            <button 
              onClick={() => setActiveView('list')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border ${
                activeView === 'list' 
                  ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              <span>List View</span>
            </button>
            <button 
              onClick={() => setActiveView('calendar')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border ${
                activeView === 'calendar' 
                  ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Calendar Timeline</span>
            </button>
          </div>
          {/* Quick Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-space-md bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-xl focus:outline-none focus:bg-surface-container transition-all" 
              placeholder="Cari tugas, tag..." 
              type="text"
            />
          </div>
        </div>
      </section>

      {/* Filter & Telemetry Strip */}
      <section className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md p-space-md rounded-2xl bg-surface-container-low mb-space-lg shadow-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {['All Tasks', 'High Priority', 'Study Space', 'Projects', 'Competitions'].map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeFilter === filter ? 'bg-purple-600 text-white border border-purple-500/30 shadow-none font-semibold' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-neutral-800/40'}`}
            >
              <span>{filter}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Workspace Canvas based on Active View */}
      {activeView === 'kanban' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">
          {/* COLUMN 1: TO DO */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-md rounded-2xl shadow-none border border-neutral-800/50 min-w-0">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <div className="w-3 h-3 rounded-full bg-outline"></div>
                <h2 className="font-sans text-base text-on-surface font-bold">To Do</h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold">{todoTasks.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-md">
              {todoTasks.map(renderCard)}
              <button onClick={() => { setEditingTaskId(null); setTaskForm({...taskForm, title: '', description: '', due_date: '', defaultStatus: 'todo'}); setIsTaskModalOpen(true); }} className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-space-xs font-body-sm text-body-sm font-medium transition-all group">
                <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">add_circle</span>
                <span>+ Tambah kartu ke To Do</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: IN PROGRESS */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-md rounded-2xl shadow-none border border-neutral-800/50 min-w-0">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <div className="w-3 h-3 rounded-full bg-secondary"></div>
                <h2 className="font-sans text-base text-on-surface font-bold">In Progress</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-xs font-semibold">{inProgressTasks.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-md">
              {inProgressTasks.map(renderCard)}
              <button onClick={() => { setEditingTaskId(null); setTaskForm({...taskForm, title: '', description: '', due_date: '', defaultStatus: 'in_progress'}); setIsTaskModalOpen(true); }} className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-space-xs font-body-sm text-body-sm font-medium transition-all group">
                <span className="material-symbols-outlined text-[18px] text-secondary group-hover:scale-110 transition-transform">add_circle</span>
                <span>+ Tambah kartu ke In Progress</span>
              </button>
            </div>
          </div>

          {/* COLUMN 3: COMPLETED */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-md rounded-2xl shadow-none border border-neutral-800/50 min-w-0">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
                <h2 className="font-sans text-base text-on-surface font-bold">Completed</h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold">{completedTasks.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-space-md">
              {completedTasks.map(renderCard)}
            </div>
          </div>
        </div>
      )}

      {activeView === 'list' && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-md w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-highest text-outline font-label-md text-label-md">
                <th className="pb-3 pr-4 w-10">Status</th>
                <th className="pb-3 pr-4">Task Name</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Priority</th>
                <th className="pb-3 pr-4">Due Date</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} className="border-b border-surface-container-highest/50 hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => setActiveTaskId(task.id)}>
                  <td className="py-4 pr-4">
                    <select 
                      className="bg-transparent border border-surface-container-highest rounded-md px-2 py-1 text-xs text-on-surface focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                      value={task.is_completed ? 'completed' : (task.tags?.includes('in_progress') ? 'in_progress' : 'todo')}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleMoveTask(task, e.target.value as any);
                      }}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className={`py-4 pr-4 font-body-md text-body-md font-semibold ${task.is_completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{task.title}</td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm">{task.category || '-'}</td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${task.priority === 'high' ? 'bg-error-container/30 text-error' : task.priority === 'medium' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'}`}>{task.priority}</span>
                  </td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => openEditModal(e, task)} className="text-outline hover:text-primary transition-colors p-2 rounded-md hover:bg-surface-container" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={(e) => handleDeleteTask(e, task.id)} className="text-outline hover:text-error transition-colors p-2 rounded-md hover:bg-surface-container" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-outline">Tidak ada task yang cocok dengan filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'calendar' && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-md w-full relative">
          <h2 className="font-headline-md font-bold text-on-surface mb-space-lg">Timeline Mendatang</h2>
          <div className="relative border-l-2 border-surface-container ml-4 pl-6 space-y-space-lg">
            {filteredTasks
              .filter(t => t.due_date)
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map(task => (
              <div key={task.id} className="relative cursor-pointer" onClick={() => setActiveTaskId(task.id)}>
                <div className={`absolute -left-[35px] w-4 h-4 rounded-full border-2 border-surface-container-lowest bg-primary`}></div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-outline font-semibold mb-1">{new Date(task.due_date).toLocaleDateString()}</span>
                  <div className="bg-surface-container hover:bg-surface-container-high transition-colors p-4 rounded-xl max-w-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded font-label-sm text-xs font-bold uppercase ${task.priority === 'high' ? 'bg-error-container/30 text-error' : task.priority === 'medium' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'}`}>{task.priority}</span>
                      <span className="text-xs text-on-surface-variant px-2 py-0.5 bg-surface-container-highest rounded">{task.is_completed ? 'Completed' : (task.tags?.includes('in_progress') ? 'In Progress' : 'To Do')}</span>
                    </div>
                    <h3 className={`font-body-md font-bold ${task.is_completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{task.title}</h3>
                    {task.description && <p className="text-sm text-on-surface-variant mt-1">{task.description}</p>}
                  </div>
                </div>
              </div>
            ))}
            {filteredTasks.filter(t => t.due_date).length === 0 && (
               <div className="text-outline text-sm italic py-4">Tidak ada tugas dengan deadline.</div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Interactive Focus Command Strip */}
      <section className="rounded-2xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-4 w-full">
          <div className="w-11 h-11 rounded-xl bg-surface-container text-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="font-mono text-xs text-secondary font-bold uppercase tracking-wider">Focus Execution Mode</span>
            <span className="text-base sm:text-lg font-bold text-on-surface truncate font-sans">
              {activeTaskObj ? activeTaskObj.title : 'Mulai sesi fokus baru?'}
            </span>
            <span className="text-xs text-on-surface-variant truncate font-normal">
              {activeTaskObj ? `Status: ${activeTaskObj.is_completed ? 'Selesai' : (activeTaskObj.tags?.includes('in_progress') ? 'In Progress' : 'To Do')}` : 'Pilih task terlebih dahulu dari daftar di atas.'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
          <button 
            onClick={() => {
              alert(`Target fokus disetel ke: ${activeTaskObj?.title}\nSilakan mulai timer sprint di halaman utama.`);
              window.location.href = '/today';
            }}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border border-purple-500/30 active:scale-95 shadow-none disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!activeTaskObj}
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Mulai Pomodoro (25m)</span>
          </button>
        </div>
      </section>

      {/* MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-4 border border-neutral-800/50">
            <h2 className="text-xl font-bold text-on-surface font-sans">{editingTaskId ? 'Edit Task' : 'Create New Task'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Judul Task</label>
                <input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Masukkan judul task" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Deskripsi (Opsional)</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={2} placeholder="Deskripsi singkat..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Kategori</label>
                  <select value={taskForm.category} onChange={e => setTaskForm({...taskForm, category: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Study Space">Study Space</option>
                    <option value="Projects">Projects</option>
                    <option value="Competitions">Competitions</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Prioritas</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800/50">
              <button onClick={() => { setIsTaskModalOpen(false); setEditingTaskId(null); }} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
              <button onClick={handleSaveTask} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors border border-purple-500/30 shadow-none cursor-pointer">Simpan Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
