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
    infoText: "Program 3 Bulan"
  },
  {
    title: "Pionir Logika: Olimpiade",
    desc: "Mengasah kemampuan analitis dan logika untuk kompetisi nasional.",
    badge: "PROGRAM UNGGULAN",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
    actionText: "Pelajari Detail →",
    infoText: "Q2 Kurikulum"
  },
  {
    title: "Guru Fokus: Tes Mandiri",
    desc: "Bimbingan personal 1-on-1 dengan jadwal belajar yang fleksibel.",
    badge: "KUSTOM",
    img: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=800&auto=format&fit=crop",
    actionText: "Daftar Sekarang →",
    infoText: "Protokol Tes"
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

  // Quick action modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompModal, setShowCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await taskApi.create({
        title: newTaskTitle,
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0]
      });
      setNewTaskTitle('');
      setShowTaskModal(false);
      showToast('Task berhasil ditambahkan!');
      fetchDashboardData();
    } catch (err) { }
  };

  const handleCreateComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompTitle.trim()) return;
    try {
      await competitionApi.create({
        title: newCompTitle,
        status: 'Active Focus',
        deadline: new Date().toISOString()
      });
      setNewCompTitle('');
      setShowCompModal(false);
      showToast('Kompetisi ditambahkan!');
      fetchDashboardData();
    } catch (err) { }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-[#09090B]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-neutral-800 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-neutral-400 tracking-wider uppercase animate-pulse">Memuat telemetry module...</p>
        </div>
      </div>
    );
  }

  const displayedTasks = tasks.filter(t => taskFilter === 'priority' ? t.priority === 'high' || t.priority === 'critical' : true).slice(0, 5);

  return (
    <div className="flex flex-col w-full space-y-5 relative">
      {/* Toast */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-neutral-900 text-neutral-100 border border-neutral-800 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 transform flex items-center gap-2.5 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-cyan-400 text-[20px]">check_circle</span>
        <span className="text-xs font-mono font-medium">{toastMessage}</span>
      </div>

      {/* TOP HERO & COGNITIVE TELEMETRY STATUS */}
      <section className="relative overflow-hidden rounded-xl bg-[#121316] border border-neutral-800 p-6">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Narrative */}
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-neutral-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 font-mono text-[11px] font-semibold text-neutral-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                {user?.workspace_name || `${user?.name || 'My'}'s Command Deck`}
              </span>
              <span className="text-neutral-600">•</span>
              <span className="font-mono text-xs text-neutral-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-800 font-mono text-[11px] text-neutral-500">
                <span className="text-neutral-300 font-medium">PLAN</span>
                <span>→</span>
                <span className="text-cyan-400 font-semibold">LEARN</span>
                <span>→</span>
                <span className="text-neutral-400 font-medium">BUILD</span>
                <span>→</span>
                <span className="text-neutral-400 font-medium">COMPETE</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
                Halo, {user?.name || 'Operator'}.
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-neutral-400 leading-relaxed max-w-xl">
                Pelan-pelan, satu langkah hari ini tetap membawa kamu lebih dekat ke versi terbaikmu. Momentum kognitifmu berada di level optimal.
              </p>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button 
                onClick={() => navigate('/study-space')} 
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Lihat Study Journey</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
              <button 
                onClick={() => { isFocusActive ? (isFocusPaused ? resumeTimer() : pauseTimer()) : startTimer(45); }} 
                className="px-4 py-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-cyan-400 text-[18px]">{isFocusActive && !isFocusPaused ? 'pause' : 'play_arrow'}</span>
                <span>{isFocusActive && !isFocusPaused ? 'Pause Fokus' : isFocusPaused ? 'Resume Fokus' : 'Mulai Fokus'}</span>
              </button>
              <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80 font-mono text-xs text-neutral-400">
                <span className="material-symbols-outlined text-cyan-400 text-[15px]">bolt</span>
                <span>Target: 4j 00m (Selesai: {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m)</span>
              </div>
            </div>
          </div>

          {/* Right Gamified Gauge */}
          <div 
            onClick={() => navigate('/progress')} 
            className="flex-shrink-0 self-start lg:self-center p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 flex items-center gap-4 min-w-[270px] cursor-pointer hover:border-neutral-700 transition-colors"
          >
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-neutral-800 fill-none" cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="7"></circle>
                <circle 
                  className="text-cyan-400 fill-none" 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="currentColor" 
                  strokeDasharray="251.32" 
                  strokeDashoffset={251.32 - ((analytics?.user?.xp || 0) % 100) / 100 * 251.32} 
                  strokeLinecap="round" 
                  strokeWidth="7" 
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-bold text-base text-neutral-100 leading-none">{analytics?.user?.xp || 0}</span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5">XP</span>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                  Lvl {Math.floor((analytics?.user?.xp || 0) / 100) + 1}
                </span>
                <span className="text-xs font-semibold text-neutral-200">Scholar</span>
              </div>
              <p className="text-xs text-neutral-400 truncate">{100 - ((analytics?.user?.xp || 0) % 100)} XP ke Level {Math.floor((analytics?.user?.xp || 0) / 100) + 2}</p>
              <div className="pt-0.5 flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>+{analytics?.today?.tasksCompleted * 10 || 0} XP Hari ini</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS TELEMETRY GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Tasks */}
        <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">TASK SELESAI</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-neutral-100">
                {analytics?.today?.tasksCompleted || 0}/{analytics?.today?.tasksTotal || 0}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {analytics?.today?.tasksTotal > 0 ? Math.round((analytics.today.tasksCompleted / analytics.today.tasksTotal) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: `${analytics?.today?.tasksTotal > 0 ? (analytics.today.tasksCompleted / analytics.today.tasksTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>{analytics?.today?.tasksCompleted || 0} target diselesaikan hari ini</span>
          </div>
        </div>

        {/* Stat 2: Study Time */}
        <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">WAKTU FOKUS</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-neutral-100">
                {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {Math.round(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100)}%
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="material-symbols-outlined text-[14px] text-neutral-500">flag</span>
            <span>Target Harian: 4j 00m</span>
          </div>
        </div>

        {/* Stat 3: Streak */}
        <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">STREAK HARIAN</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-neutral-100">{analytics?.user?.streak || 0} Hari</span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {analytics?.user?.streak > 0 ? 'AKTIF' : 'INAKTIF'}
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(((analytics?.user?.streak || 0) / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-neutral-400">
            <span className={`w-1.5 h-1.5 rounded-full ${analytics?.user?.streak > 0 ? 'bg-cyan-400' : 'bg-neutral-600'}`}></span>
            <span>{analytics?.user?.streak > 0 ? 'Momentum konsistensi terjaga' : 'Mulai sesi fokus hari ini'}</span>
          </div>
        </div>

        {/* Stat 4: Next Countdown */}
        <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">DEADLINE TERDEKAT</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-neutral-100">
                {projects.length > 0 && projects[0].deadline ? new Date(projects[0].deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-500" 
                style={{ width: projects.length > 0 && projects[0].deadline ? '60%' : '0%' }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-neutral-400 truncate">
            <span className="truncate">{projects.length > 0 && projects[0].deadline ? projects[0].title : 'Tidak ada tenggat waktu'}</span>
          </div>
        </div>
      </section>

      {/* CORE TWO-COLUMN TELEMETRY DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-5">

          {/* TASKS */}
          <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">Today's Mission</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{tasks.filter(t => !t.is_completed).length} dari {tasks.length} target harian tersisa</p>
                </div>
              </div>
              <div className="flex items-center p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                <button 
                  onClick={() => setTaskFilter('all')} 
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${taskFilter === 'all' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  Semua
                </button>
                <button 
                  onClick={() => setTaskFilter('priority')} 
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${taskFilter === 'priority' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  Prioritas
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {displayedTasks.length > 0 ? (
                displayedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`p-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                      task.is_completed 
                        ? 'bg-neutral-900/40 border-neutral-800/50 opacity-65' 
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button 
                        onClick={() => handleToggleTask(task.id, task.is_completed, task.xp)} 
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                          task.is_completed 
                            ? 'bg-cyan-500 text-neutral-950 font-bold' 
                            : 'bg-neutral-800 border border-neutral-700 text-transparent hover:text-cyan-400 hover:border-cyan-500/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">done</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.is_completed ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              DONE
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                              task.priority === 'high' || task.priority === 'critical'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : task.priority === 'medium' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700/50'
                            }`}>
                              {task.priority || 'NORMAL'}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700/50">
                            {task.category || 'General'}
                          </span>
                        </div>
                        <h3 className={`mt-1 text-sm ${task.is_completed ? 'font-normal text-neutral-400 line-through truncate' : 'font-medium text-neutral-200 truncate'}`}>
                          {task.title}
                        </h3>
                        {!task.is_completed && task.description && (
                          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-cyan-400">
                      <span className="text-xs font-mono font-semibold">+{task.xp}XP</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center border border-dashed border-neutral-800 rounded-lg">
                  <span className="material-symbols-outlined text-neutral-600 text-[36px] mb-1">task</span>
                  <p className="text-xs text-neutral-400 font-mono">Belum ada task aktif hari ini.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowTaskModal(true)} 
              className="w-full py-2.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Tambah Task Baru</span>
            </button>
          </div>

          {/* ACTIVE PROJECTS */}
          <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">Active Projects & Builds</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{projects.length} artefak dalam jalur kompilasi</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/projects')} 
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Semua Proyek <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.length > 0 ? (
                projects.slice(0, 4).map((project) => (
                  <div key={project.id} className="p-4 rounded-lg bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        PROJECT
                      </span>
                      <span className="text-xs font-mono text-neutral-400 font-semibold">{project.progress}% Done</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-100 truncate">{project.title}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{project.description || 'Tidak ada deskripsi tambahan'}</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${project.progress}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-0.5">
                      <span>Status: {project.status}</span>
                      <span className="material-symbols-outlined text-[16px] text-neutral-400">memory</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center border border-dashed border-neutral-800 rounded-lg">
                  <span className="material-symbols-outlined text-neutral-600 text-[36px] mb-1">construction</span>
                  <p className="text-xs text-neutral-400 font-mono">Belum ada project aktif.</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE COMPETITIONS */}
          <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">trophy</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">Active Competitions</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Tantangan kompetitif yang sedang dikejar</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCompModal(true)} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 text-xs font-medium transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Tambah Target</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {competitions.length > 0 ? (
                competitions.slice(0, 3).map((comp) => (
                  <div key={comp.id} className="p-3.5 rounded-lg bg-neutral-900/70 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700/50">
                          {comp.deadline ? `DEADLINE: ${new Date(comp.deadline).toLocaleDateString('id-ID')}` : 'NO DEADLINE'}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400">{comp.status}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-100 truncate">{comp.title}</h4>
                      <p className="text-xs text-neutral-400 line-clamp-1">{comp.description || 'Target kompetisi aktif'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => navigate('/competitions')} 
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Buka Workspace
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center border border-dashed border-neutral-800 rounded-lg">
                  <span className="material-symbols-outlined text-neutral-600 text-[36px] mb-1">emoji_events</span>
                  <p className="text-xs text-neutral-400 font-mono">Belum ada kompetisi yang diikuti.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 space-y-5">

          {/* GOALS */}
          <div 
            onClick={() => navigate('/goals')} 
            className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-colors space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">Goals & Vision</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">North-star arah pembelajaran</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {goals.length} Aktif
              </span>
            </div>

            <div className="space-y-2.5">
              {goals.length > 0 ? (
                goals.slice(0, 4).map(goal => (
                  <div key={goal.id} className="p-3 rounded-lg bg-neutral-900/70 border border-neutral-800/80 space-y-2 hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate mr-2">
                        <span className="material-symbols-outlined text-cyan-400 text-[16px]">flag</span>
                        <span className="text-xs font-semibold text-neutral-200 truncate">{goal.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700/50 whitespace-nowrap">
                        {goal.category || 'Goal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-400 text-[11px]">Progress</span>
                      <span className="text-cyan-400 font-semibold">{goal.progress_percentage}% Selesai</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${goal.progress_percentage}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center border border-dashed border-neutral-800 rounded-lg">
                  <span className="material-symbols-outlined text-neutral-600 text-[36px] mb-1">golf_course</span>
                  <p className="text-xs text-neutral-400 font-mono">Belum ada target jangka panjang.</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE LEARNING PATHS (SKILLS TELEMETRY) */}
          <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-100">Skills Telemetry</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Kompetensi teknis bertingkat</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-neutral-500 text-[18px]">insights</span>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-200">Python & AI Engineering</span>
                  <span className="font-mono font-semibold text-cyan-400">82%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: '82%' }}></div>
                </div>
                <span className="block text-[11px] font-mono text-neutral-500">Distribusi dari 82 jam sprint</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-200">Cloud & Systems Architecture</span>
                  <span className="font-mono font-semibold text-cyan-400">64%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: '64%' }}></div>
                </div>
                <span className="block text-[11px] font-mono text-neutral-500">Distribusi dari 64 jam sprint</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-200">Golang Microservices</span>
                  <span className="font-mono font-semibold text-cyan-400">50%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: '50%' }}></div>
                </div>
                <span className="block text-[11px] font-mono text-neutral-500">Distribusi dari 50 jam sprint</span>
              </div>
            </div>
          </div>

          {/* FOCUS SANCTUARY */}
          <div className="p-5 rounded-xl bg-[#121316] border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AUDIO FOCUS
              </span>
              <button 
                onClick={() => setIsAudioModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full bg-cyan-400 ${isPlayingBinaural ? 'animate-pulse' : ''}`}></span>
                <span>432Hz Live</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-900/70 border border-neutral-800/80 space-y-1">
              <p className="text-xs italic text-neutral-300 leading-relaxed">
                “Consistency is the silent architecture of true mastery.”
              </p>
              <span className="block text-[11px] font-mono text-neutral-500">— Ambis Mindset Principle</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Deep Alpha Waves</h4>
                <p className="text-[11px] font-mono text-neutral-400">Sirkuit Pemrograman Mendalam</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsAudioModalOpen(true)}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center border border-neutral-700/50 transition-colors cursor-pointer"
                  title="Audio Modal"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                </button>
                <button 
                  onClick={toggleBinaural} 
                  className="w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 flex items-center justify-center transition-colors cursor-pointer font-bold"
                  title={isPlayingBinaural ? "Pause Audio" : "Play Audio"}
                >
                  <span className="material-symbols-outlined text-[20px]">{isPlayingBinaural ? 'pause' : 'play_arrow'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REKOMENDASI BIMBEL */}
      <section className="space-y-4 pt-2 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px]">school</span>
              <span>PROGRAM REKOMENDASI</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-100">Rekomendasi Bimbel</h2>
            <p className="text-xs sm:text-sm text-neutral-400">Akses bimbingan belajar terbaik untuk mempercepat pencapaian target ambisimu.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <button 
              onClick={handlePrevCarousel} 
              className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Sebelumnya"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              onClick={handleNextCarousel} 
              className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Selanjutnya"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden relative">
          {[0, 1, 2].map(offset => {
            const idx = (carouselIndex + offset) % GALLERY.length;
            const item = GALLERY[idx];
            return (
              <div 
                key={idx} 
                className="relative group overflow-hidden rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 flex flex-col h-72 transition-colors duration-200"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent"></div>
                
                {/* Header Tag */}
                <div className="relative z-10 flex items-center justify-between p-4">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-neutral-900/80 backdrop-blur-md text-cyan-400 border border-neutral-700/60">
                    {item.badge}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showToast(`Bimbel disimpan: ${item.title}`);
                    }}
                    className="w-8 h-8 rounded-lg bg-neutral-900/80 backdrop-blur-md text-neutral-300 hover:text-white border border-neutral-700/60 flex items-center justify-center transition-colors cursor-pointer"
                    title="Simpan Rekomendasi"
                  >
                    <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  </button>
                </div>

                {/* Footer Info */}
                <div className="relative z-10 mt-auto p-4 space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-neutral-100 group-hover:text-cyan-400 transition-colors">{item.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{item.desc}</p>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(`Membuka: ${item.title}`);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group-hover:translate-x-0.5 duration-200 cursor-pointer"
                    >
                      {item.actionText}
                    </button>
                    <span className="text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded-md bg-neutral-900/80 border border-neutral-800">
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
      <div 
        onClick={() => navigate('/progress')} 
        className="p-5 rounded-xl bg-[#121316] border border-neutral-800 hover:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Accelerate Your Vision</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Konsistensi kecil yang berulang setiap hari menghasilkan kemajuan eksponensial.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block font-mono">
            <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block">Engine Status</span>
            <span className="text-xs text-cyan-400 font-medium">Session Optimized</span>
          </div>
          <button className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* QUICK ADD TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121316] p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-neutral-800 relative space-y-4">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-[20px]">add_task</span>
              Quick Add Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <input 
                required 
                value={newTaskTitle} 
                onChange={e => setNewTaskTitle(e.target.value)} 
                type="text" 
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-500/50 text-neutral-100 placeholder:text-neutral-500 p-3 rounded-xl focus:outline-none text-xs" 
                placeholder="Deskripsi tugas cepat..." 
                autoFocus 
              />
              <div className="flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)} 
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD COMP MODAL */}
      {showCompModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#121316] p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-neutral-800 relative space-y-4">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-[20px]">emoji_events</span>
              Tambah Target Kompetisi
            </h2>
            <form onSubmit={handleCreateComp} className="space-y-4">
              <input 
                required 
                value={newCompTitle} 
                onChange={e => setNewCompTitle(e.target.value)} 
                type="text" 
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-500/50 text-neutral-100 placeholder:text-neutral-500 p-3 rounded-xl focus:outline-none text-xs" 
                placeholder="Nama Hackathon / Lomba..." 
                autoFocus 
              />
              <div className="flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setShowCompModal(false)} 
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
