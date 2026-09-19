import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi, projectApi, competitionApi, goalApi, analyticsApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';
import { useFocusTimer } from '../context/FocusTimerContext';

const BIMBEL_RECOMMENDATIONS = [
  {
    title: "Akademi Belajar Quantum",
    desc: "Materi ringkas, tutor inspiratif, dan fokus pada esensi ujian.",
    badge: "BIMBEL",
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
    actionText: "Learn More →",
    infoText: "Program 3 Bulan",
    color: "text-secondary",
    badgeColor: "text-secondary"
  },
  {
    title: "Pionir Logika: Olimpiade",
    desc: "Mengasah kemampuan analitis dan logika untuk kompetisi nasional.",
    badge: "PROGRAM UNGGULAN",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
    actionText: "Pelajari Detail →",
    infoText: "Q2 Kurikulum",
    color: "text-primary",
    badgeColor: "text-primary"
  },
  {
    title: "Guru Fokus: Tes Mandiri",
    desc: "Bimbingan personal 1-on-1 dengan jadwal belajar yang fleksibel.",
    badge: "KUSTOM",
    img: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop",
    actionText: "Daftar Sekarang →",
    infoText: "Protokol Tes",
    color: "text-tertiary",
    badgeColor: "text-tertiary"
  }
];

const GALLERY = BIMBEL_RECOMMENDATIONS;

const Dashboard = () => {
  const navigate = useNavigate();

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [taskFilter, setTaskFilter] = useState<'all' | 'priority'>('all');
  const [toastMessage, setToastMessage] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const { 
    user,
    isPlayingBinaural, 
    toggleBinaural,
    setIsAudioModalOpen
  } = useGlobalState();
  const {
    isActive: isFocusActive,
    isPaused: isFocusPaused,
    startTimer,
    pauseTimer,
    resumeTimer
  } = useFocusTimer();

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const [
        tasksRes, 
        projectsRes, 
        competitionsRes, 
        goalsRes, 
        analyticsRes
      ] = await Promise.all([
        taskApi.getAll({ date: today }), 
        projectApi.getAll(),
        competitionApi.getAll(),
        goalApi.getAll(),
        analyticsApi.getSummary()
      ]);

      setTasks(tasksRes.data);
      setProjects(projectsRes.data.filter((p: any) => p.status === 'active' || p.status === 'development'));
      setCompetitions(competitionsRes.data.filter((c: any) => c.status === 'Active Focus'));
      setGoals(goalsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Timer logic is now in GlobalContext, removed local effect

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleTask = async (id: string, currentStatus: boolean, xp: number) => {
    try {
      await taskApi.update(id, { is_completed: !currentStatus });
      showToast(!currentStatus ? `Task Selesai! +${xp} XP` : 'Status task dibatalkan.');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextCarousel = () => {
    setCarouselIndex(prev => (prev + 1) % GALLERY.length);
  };

  const handlePrevCarousel = () => {
    setCarouselIndex(prev => (prev - 1 + GALLERY.length) % GALLERY.length);
  };

  // Removed local formatTimer

  // Quick form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await taskApi.create({
        title: newTaskTitle,
        category: 'General',
        priority: 'medium',
        due_date: new Date().toISOString()
      });
      setShowTaskModal(false);
      setNewTaskTitle('');
      showToast('Task ditambahkan!');
      fetchDashboardData();
    } catch (err) { }
  };

  const [newCompTitle, setNewCompTitle] = useState('');
  const handleCreateComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompTitle) return;
    try {
      await competitionApi.create({
        title: newCompTitle,
        type: 'Hackathon',
        status: 'Active Focus',
        deadline: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString()
      });
      setShowCompModal(false);
      setNewCompTitle('');
      showToast('Kompetisi ditambahkan!');
      fetchDashboardData();
    } catch (err) { }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant animate-pulse">Memuat telemetry module...</p>
        </div>
      </div>
    );
  }

  const displayedTasks = tasks.filter(t => taskFilter === 'priority' ? t.priority === 'high' || t.priority === 'critical' : true).slice(0, 5);

  return (
    <div className="flex flex-col w-full space-y-space-lg relative">
      {/* Toast */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-surface-container-highest px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-2 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="font-label-md font-semibold">{toastMessage}</span>
      </div>

      {/* Audio logic moved to global layout */}

      {/* TOP HERO & COGNITIVE TELEMETRY STATUS */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-24 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
          {/* Left Narrative */}
          <div className="max-w-2xl space-y-space-md">
            <div className="flex flex-wrap items-center gap-space-xs text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                {user?.workspace_name || `${user?.name || 'My'}'s Command Deck`}
              </span>
              <span className="font-label-sm text-label-sm text-outline">•</span>
              <span className="font-label-sm text-label-sm text-outline-variant font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <div className="hidden sm:flex items-center gap-1 ml-space-sm pl-space-sm font-label-sm text-label-sm text-outline border-l-0">
                <span className="text-on-surface-variant font-semibold">PLAN</span>
                <span className="text-outline">→</span>
                <span className="text-primary font-semibold">LEARN</span>
                <span className="text-outline">→</span>
                <span className="text-secondary font-semibold">BUILD</span>
                <span className="text-outline">→</span>
                <span className="text-tertiary font-semibold">COMPETE</span>
              </div>
            </div>

            <div>
              <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                Halo, {user?.name || 'Operator'}.
              </h1>
              <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">
                Pelan-pelan, satu langkah hari ini tetap membawa kamu lebih dekat ke versi terbaikmu. Momentum kognitifmu berada di level optimal.
              </p>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
              <button onClick={() => navigate('/study-space')} className="px-space-lg py-space-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-label-lg text-label-lg font-bold flex items-center gap-space-xs transition-all border border-purple-500/40 active:scale-95 cursor-pointer">
                <span>Lihat Study Journey</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button onClick={() => { isFocusActive ? (isFocusPaused ? resumeTimer() : pauseTimer()) : startTimer(45); }} className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-medium flex items-center gap-space-xs transition-colors border border-neutral-700/60 group cursor-pointer">
                <span className="material-symbols-outlined text-secondary text-[20px] group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>{isFocusActive && !isFocusPaused ? 'pause' : 'play_arrow'}</span>
                <span>{isFocusActive && !isFocusPaused ? 'Pause Fokus' : isFocusPaused ? 'Resume Fokus' : 'Mulai Fokus'}</span>
              </button>
              <div className="hidden xl:flex items-center gap-2 px-space-md py-space-xs rounded-lg bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-[16px]">bolt</span>
                <span>Target Harian: 4j 00m (Selesai: {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m)</span>
              </div>
            </div>
          </div>

          {/* Right Gamified Gauge */}
          <div onClick={() => navigate('/progress')} className="relative flex-shrink-0 self-center lg:self-auto p-space-md rounded-xl bg-surface-container/80 backdrop-blur-md shadow-lg flex items-center gap-space-md min-w-[280px] cursor-pointer hover:ring-2 ring-primary/30 transition-all">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container-highest fill-none" cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="text-primary fill-none shadow-[0_0_12px_rgba(208,188,255,0.7)]" cx="50" cy="50" r="42" stroke="currentColor" strokeDasharray="263.89" strokeDashoffset={263.89 - ((analytics?.user?.xp || 0) % 100) / 100 * 263.89} strokeLinecap="round" strokeWidth="8" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="font-headline-md text-headline-md font-bold text-on-surface leading-none">{analytics?.user?.xp || 0}</span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">XP</span>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-primary-container/30 text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">Lvl {Math.floor((analytics?.user?.xp || 0) / 100) + 1}</span>
                <span className="font-label-md text-label-md font-semibold text-on-surface">Scholar</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{100 - ((analytics?.user?.xp || 0) % 100)} XP lagi menuju Level {Math.floor((analytics?.user?.xp || 0) / 100) + 2}</p>
              <div className="pt-1 flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></span>
                <span>+{analytics?.today?.tasksCompleted * 10 || 0} XP Hari ini</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS TELEMETRY GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Stat 1: Tasks */}
        <div className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">Task Selesai</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">{analytics?.today?.tasksCompleted || 0}/{analytics?.today?.tasksTotal || 0}</span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold">
              {analytics?.today?.tasksTotal > 0 ? Math.round((analytics.today.tasksCompleted / analytics.today.tasksTotal) * 100) : 0}%
            </span>
          </div>
          <div className="mt-space-sm w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${analytics?.today?.tasksTotal > 0 ? (analytics.today.tasksCompleted / analytics.today.tasksTotal) * 100 : 0}%` }}></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="text-secondary font-bold">-</span>
            <span>{analytics?.today?.tasksCompleted || 0} task selesai hari ini</span>
          </div>
        </div>

        {/* Stat 2: Study Time */}
        <div className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">Waktu Belajar</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">timer</span>
            </div>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">
              {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m
            </span>
          </div>
          <div className="mt-space-sm w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(208,188,255,0.4)]" style={{ width: `${Math.min(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100, 100)}%` }}></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-primary">flag</span>
            <span>Target Harian: 4j 00m ({Math.round(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100)}%)</span>
          </div>
        </div>

        {/* Stat 3: Streak */}
        <div className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">Streak Belajar</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">{analytics?.user?.streak || 0} Hari</span>
          </div>
          <div className="mt-space-sm w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min(((analytics?.user?.streak || 0) / 30) * 100, 100)}%` }}></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="text-tertiary font-bold">{analytics?.user?.streak > 0 ? '● Aktif' : '○ Inaktif'}</span>
            <span>{analytics?.user?.streak > 0 ? 'Pertahankan momentum!' : 'Belum ada aktivitas'}</span>
          </div>
        </div>

        {/* Stat 4: Next Countdown */}
        <div className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm font-bold tracking-wider text-outline uppercase">Deadline Terdekat</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
              <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
            </div>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-secondary">
              {projects.length > 0 && projects[0].deadline ? new Date(projects[0].deadline).toLocaleDateString() : '-'}
            </span>
          </div>
          <div className="mt-space-sm w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: projects.length > 0 && projects[0].deadline ? '50%' : '0%' }}></div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant truncate">
            <span>{projects.length > 0 && projects[0].deadline ? projects[0].title : 'Belum ada deadline mendesak'}</span>
          </div>
        </div>
      </section>

      {/* CORE TWO-COLUMN TELEMETRY DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-space-lg">

          {/* TASKS */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm">
            <div className="flex items-center justify-between pb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded bg-secondary-container/20 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Today's Mission</h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{tasks.filter(t => !t.is_completed).length} dari {tasks.length} target harian tersisa</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5">
                <button onClick={() => setTaskFilter('all')} className={`px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold transition-colors ${taskFilter === 'all' ? 'bg-surface-container-high text-on-surface' : 'text-outline hover:text-on-surface'}`}>Semua</button>
                <button onClick={() => setTaskFilter('priority')} className={`px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold transition-colors ${taskFilter === 'priority' ? 'bg-surface-container-high text-on-surface' : 'text-outline hover:text-on-surface'}`}>Prioritas</button>
              </div>
            </div>

            <div className="space-y-space-sm">
              {displayedTasks.length > 0 ? (
                displayedTasks.map(task => (
                  <div key={task.id} className={`p-space-sm rounded-lg transition-colors flex items-start justify-between gap-space-sm ${task.is_completed ? 'bg-surface-container/50 opacity-75' : 'bg-surface-container hover:bg-surface-container-high group'}`}>
                    <div className="flex items-start gap-space-sm flex-1 min-w-0">
                      <button onClick={() => handleToggleTask(task.id, task.is_completed, task.xp)} className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${task.is_completed ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-surface hover:bg-secondary border-0'}`}>
                        <span className="material-symbols-outlined text-[14px]">{task.is_completed ? 'done' : 'check'}</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          {task.is_completed ? (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold uppercase">Done</span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-error-container/30 text-error' : task.priority === 'medium' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'} font-label-sm text-label-sm font-bold uppercase`}>{task.priority}</span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm ${task.is_completed ? 'text-outline' : 'bg-primary-container/20 text-primary'}`}>
                            {task.category || 'General'}
                          </span>
                        </div>
                        <h3 className={`mt-1 font-body-md text-body-md ${task.is_completed ? 'font-medium text-on-surface-variant line-through truncate' : 'font-semibold text-on-surface truncate'}`}>
                          {task.title}
                        </h3>
                        {!task.is_completed && task.description && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${task.is_completed ? 'text-secondary' : 'text-outline group-hover:text-on-surface-variant'}`}>
                      <span className="font-label-sm text-label-sm font-mono">+{task.xp}XP</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">task</span>
                  <p className="font-body-md text-outline">Belum ada task hari ini.</p>
                </div>
              )}
            </div>

            <button onClick={() => setShowTaskModal(true)} className="mt-space-md w-full py-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Tambah Task Baru</span>
            </button>
          </div>

          {/* ACTIVE PROJECTS */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded bg-primary-container/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Active Projects & Builds</h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{projects.length} artefak dalam jalur kompilasi</p>
                </div>
              </div>
              <button onClick={() => navigate('/projects')} className="font-label-sm text-label-sm font-semibold text-primary hover:text-primary-fixed transition-colors flex items-center gap-0.5">
                Semua Proyek <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {projects.length > 0 ? (
                projects.slice(0, 4).map((project, idx) => (
                  <div key={project.id} className="p-space-md rounded-lg bg-surface-container space-y-space-sm">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${idx % 2 === 0 ? 'bg-secondary-container/20 text-secondary' : 'bg-primary-container/20 text-primary'}`}>
                        Project
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{project.progress}% Done</span>
                    </div>
                    <div>
                      <h4 className="font-body-md text-body-md font-bold text-on-surface">{project.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">{project.description}</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className={`h-full rounded-full ${idx % 2 === 0 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${project.progress}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm text-outline pt-1">
                      <span>Status: {project.status}</span>
                      <span className={`material-symbols-outlined text-[16px] ${idx % 2 === 0 ? 'text-secondary' : 'text-primary'}`}>
                        {idx % 2 === 0 ? 'memory' : 'psychology'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">construction</span>
                  <p className="font-body-md text-outline">Belum ada active project.</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE COMPETITIONS */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">trophy</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Active Competitions</h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Tantangan kompetitif yang sedang dikejar</p>
                </div>
              </div>
              <button onClick={() => setShowCompModal(true)} className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium transition-colors">
                + Tambah Target
              </button>
            </div>

            <div className="space-y-space-sm">
              {competitions.length > 0 ? (
                competitions.slice(0, 3).map((comp, idx) => (
                  <div key={comp.id} className="p-space-md rounded-lg bg-surface-container flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex items-center gap-space-xs">
                        <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${idx === 0 ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-highest text-on-surface'}`}>
                          {comp.deadline ? `DEADLINE: ${new Date(comp.deadline).toLocaleDateString('id-ID')}` : 'NO DEADLINE'}
                        </span>
                        <span className={`font-label-sm text-label-sm font-mono ${idx === 0 ? 'text-secondary' : 'text-outline'}`}>{comp.status}</span>
                      </div>
                      <h4 className="font-body-md text-body-md font-bold text-on-surface truncate">{comp.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{comp.description}</p>
                    </div>
                    <div className="flex items-center gap-space-md flex-shrink-0">
                      <button onClick={() => navigate('/competitions')} className="px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-secondary hover:text-on-secondary text-on-surface font-label-sm text-label-sm font-bold transition-colors">
                        Buka Workspace
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">emoji_events</span>
                  <p className="font-body-md text-outline">Belum ada kompetisi yang diikuti.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 space-y-space-lg">

          {/* GOALS */}
          <div onClick={() => navigate('/goals')} className="p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded bg-primary-container/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Goals & Vision</h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">North-star arah pembelajaran</p>
                </div>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">{goals.length} Aktif</span>
            </div>

            <div className="space-y-space-sm">
              {goals.length > 0 ? (
                goals.slice(0, 4).map(goal => (
                  <div key={goal.id} className="p-space-md rounded-lg bg-surface-container space-y-space-xs hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs truncate mr-2">
                        <span className={`material-symbols-outlined text-primary text-[16px]`}>flag</span>
                        <span className="font-body-md text-body-md font-bold text-on-surface truncate">{goal.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm whitespace-nowrap">{goal.category || 'Goal'}</span>
                    </div>
                    <div className="pt-2 flex items-center justify-between font-label-sm text-label-sm">
                      <span className="text-on-surface-variant">Progress</span>
                      <span className={`text-primary font-mono font-bold`}>{goal.progress_percentage}% Selesai</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className={`h-full bg-primary rounded-full`} style={{ width: `${goal.progress_percentage}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">golf_course</span>
                  <p className="font-body-md text-outline">Belum ada goal yang ditentukan.</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE LEARNING PATHS */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded bg-secondary-container/20 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Skills Telemetry</h2>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Kompetensi teknis bertingkat</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">insights</span>
            </div>

            <div className="space-y-space-md">
              <div className="space-y-1">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-on-surface font-bold">Python & AI Engineering</span>
                  <span className="text-secondary font-mono">82%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '82%' }}></div>
                </div>
                <span className="block font-label-sm text-label-sm text-outline">Distribusi dari 82 jam sprint</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-on-surface font-bold">Cloud & Systems Architecture</span>
                  <span className="text-primary font-mono">64%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '64%' }}></div>
                </div>
                <span className="block font-label-sm text-label-sm text-outline">Distribusi dari 64 jam sprint</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-label-md text-label-md">
                  <span className="text-on-surface font-bold">Golang Microservices</span>
                  <span className="text-tertiary font-mono">50%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full" style={{ width: '50%' }}></div>
                </div>
                <span className="block font-label-sm text-label-sm text-outline">Distribusi dari 50 jam sprint</span>
              </div>
            </div>
          </div>

          {/* FOCUS SANCTUARY */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 space-y-space-md">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider">
                  Audio Sanctuary
                </span>
                <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary cursor-pointer" onClick={() => setIsAudioModalOpen(true)}>
                  <span className={`w-2 h-2 rounded-full bg-secondary ${isPlayingBinaural ? 'animate-ping' : ''}`}></span>
                  432Hz Live
                </span>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container/70 backdrop-blur-sm space-y-space-xs">
                <p className="font-body-md text-body-md italic text-on-surface">
                  “Consistency is the silent architecture of true mastery.”
                </p>
                <span className="block font-label-sm text-label-sm text-outline">— Ambis Mindset Principle</span>
              </div>
              <div className="flex items-center justify-between pt-space-xs">
                <div>
                  <h4 className="font-body-sm text-body-sm font-bold text-on-surface">Deep Alpha Waves</h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Sirkuit Pemrograman Mendalam</p>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">skip_previous</span>
                  </button>
                  <button onClick={toggleBinaural} className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-[0_0_14px_rgba(76,215,246,0.4)] hover:bg-secondary-fixed transition-colors">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{isPlayingBinaural ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">skip_next</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REKOMENDASI BIMBEL */}
      <section className="space-y-space-md pt-space-md relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[16px]">school</span>
              <span>PROGRAM REKOMENDASI</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Rekomendasi Bimbel</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Akses bimbingan belajar terbaik untuk mempercepat pencapaian target ambisimu.</p>
          </div>
          <div className="hidden sm:flex items-center gap-space-xs">
            <button 
              onClick={handlePrevCarousel} 
              className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              title="Sebelumnya"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button 
              onClick={handleNextCarousel} 
              className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              title="Selanjutnya"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md overflow-hidden relative">
          
          {[0, 1, 2].map(offset => {
            const idx = (carouselIndex + offset) % GALLERY.length;
            const item = GALLERY[idx];
            return (
              <div key={idx} className="relative group overflow-hidden rounded-xl bg-surface-container-low shadow-md flex flex-col h-72 border border-surface-container-highest/20 hover:border-secondary/40 transition-all duration-300">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${item.img}')` }}>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/70 to-transparent"></div>
                <div className="relative z-10 flex items-center justify-between p-space-md">
                  <span className={`px-2.5 py-1 rounded bg-surface-container-lowest/80 backdrop-blur-md font-label-sm text-label-sm font-bold ${item.badgeColor} uppercase tracking-wider`}>
                    {item.badge}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showToast(`Bimbel disimpan: ${item.title}`);
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container-lowest/60 backdrop-blur-md text-on-surface flex items-center justify-center hover:bg-surface-container-high hover:text-secondary transition-colors cursor-pointer"
                    title="Simpan Rekomendasi"
                  >
                    <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  </button>
                </div>
                <div className="relative z-10 mt-auto p-space-md space-y-1">
                  <h3 className="font-body-lg text-body-lg font-bold text-on-surface group-hover:text-secondary transition-colors">{item.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{item.desc}</p>
                  <div className="pt-2 flex items-center justify-between font-label-sm text-label-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(`Membuka: ${item.title}`);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-secondary hover:text-[#4cd7f6] hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.6)] transition-all group-hover:translate-x-0.5 duration-200 cursor-pointer focus:outline-none"
                    >
                      {item.actionText}
                    </button>
                    <span className="text-outline text-xs px-2 py-0.5 rounded bg-surface-container/70 border border-outline/10">
                      {item.infoText}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer Banner */}
      <div onClick={() => navigate('/progress')} className="mt-space-lg p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md cursor-pointer hover:bg-surface-container transition-colors border border-transparent hover:border-surface-container-highest">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
          </div>
          <div>
            <h3 className="font-body-md text-body-md font-bold text-on-surface">Accelerate Your Vision</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Konsistensi kecil yang berulang setiap hari menghasilkan kemajuan eksponensial.</p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <div className="text-right hidden sm:block">
            <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">Engine Status</span>
            <span className="block font-label-sm text-label-sm text-secondary">Session Optimized</span>
          </div>
          <button className="w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors border border-purple-500/40">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* QUICK ADD TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-surface-container-highest relative">
            <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary">add_task</span>
              Quick Add Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <input required value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="Deskripsi tugas cepat..." autoFocus />
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTaskModal(false)} className="px-6 py-2 rounded-xl bg-surface-container text-on-surface">Batal</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-secondary text-on-secondary font-bold hover:brightness-110">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD COMP MODAL */}
      {showCompModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-surface-container-highest relative">
            <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-tertiary">emoji_events</span>
              Tambah Target Kompetisi
            </h2>
            <form onSubmit={handleCreateComp} className="space-y-4">
              <input required value={newCompTitle} onChange={e => setNewCompTitle(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="Nama Hackathon / Lomba..." autoFocus />
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCompModal(false)} className="px-6 py-2 rounded-xl bg-surface-container text-on-surface">Batal</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-tertiary text-on-tertiary font-bold hover:brightness-110">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timer Modal has been replaced by Global Header timer state */}

    </div>
  );
};

export default Dashboard;
