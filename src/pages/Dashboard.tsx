import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi, projectApi, competitionApi, goalApi, analyticsApi, studySessionApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';
import { useFocusTimer } from '../context/FocusTimerContext';
import { useDailyRituals } from '../context/RitualContext';
import { fetchCrucialDeadlines, type CrucialDeadlineItem } from '../utils/deadlineUtils';

const formatRupiah = (num: number) => {
  if (!num || num === 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const parseCompInfo = (comp: any) => {
  let prizePool = 0;
  let checklist: any[] = [];
  try {
    const parsed = JSON.parse(comp.description || '{}');
    if (parsed && parsed.isJSONCompDesc) {
      prizePool = parsed.prizePool || 0;
      checklist = parsed.checklist || [];
    }
  } catch (e) { }

  let progressPercent = 0;
  if (checklist.length > 0) {
    const doneCount = checklist.filter((c: any) => c.isChecked).length;
    progressPercent = Math.round((doneCount / checklist.length) * 100);
  } else {
    const st = (comp.status || '').toLowerCase();
    if (st === 'submitted') progressPercent = 90;
    else if (st === 'active focus' || st === 'active') progressPercent = 50;
    else if (st === 'preparing' || st === 'preparation') progressPercent = 25;
  }

  let daysRemaining = 'TBA';
  if (comp.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(comp.deadline);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) daysRemaining = 'Berakhir';
    else if (diff === 0) daysRemaining = 'Hari Ini!';
    else if (diff === 1) daysRemaining = 'Besok';
    else daysRemaining = `Sisa ${diff} Hari`;
  }

  return { prizePool, progressPercent, daysRemaining };
};

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
  const [crucialDeadlines, setCrucialDeadlines] = useState<CrucialDeadlineItem[]>([]);
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
    resumeTimer,
    stopTimer,
    formatTimer,
    pendingSession,
    clearPendingSession,
  } = useFocusTimer();

  // Quick action modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompModal, setShowCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  
  // Ritual states
  const { rituals, toggleRitual, addRitual, updateRitual, deleteRitual } = useDailyRituals();
  const [showRitualModal, setShowRitualModal] = useState(false);
  const [newRitualTitle, setNewRitualTitle] = useState('');
  const [newRitualTarget, setNewRitualTarget] = useState(30);
  const [editingRitualId, setEditingRitualId] = useState<string | null>(null);
  const [editRitualTitle, setEditRitualTitle] = useState('');
  const [editRitualTarget, setEditRitualTarget] = useState(30);
  const [confirmDeleteRitualId, setConfirmDeleteRitualId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        tasksRes,
        projectsRes,
        competitionsRes,
        goalsRes,
        analyticsRes,
        cDeadlines
      ] = await Promise.all([
        taskApi.getAll({ date: today }),
        projectApi.getAll(),
        competitionApi.getAll(),
        goalApi.getAll(),
        analyticsApi.getSummary(),
        fetchCrucialDeadlines()
      ]);

      setTasks(tasksRes.data);
      setProjects(projectsRes.data.filter((p: any) => p.status === 'Planning' || p.status === 'Development'));
      setCompetitions(competitionsRes.data.filter((c: any) => {
        const st = (c.status || '').toLowerCase();
        return st !== 'finished' && st !== 'completed' && st !== 'archived';
      }));
      setGoals(goalsRes.data);
      setAnalytics(analyticsRes.data);
      setCrucialDeadlines(cDeadlines);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleSync = () => {
      fetchDashboardData();
    };
    window.addEventListener('ambis:tasks-updated', handleSync);
    return () => window.removeEventListener('ambis:tasks-updated', handleSync);
  }, [fetchDashboardData]);

  // Auto-save completed focus session when stopped on Dashboard
  useEffect(() => {
    if (pendingSession) {
      const autoSave = async () => {
        try {
          await studySessionApi.create({
            title: pendingSession.topic || "Sesi Fokus Selesai",
            duration_minutes: pendingSession.duration,
            takeaway: "Sesi selesai (Auto-logged)",
            start_time: new Date(Date.now() - pendingSession.duration * 60000).toISOString(),
            end_time: new Date().toISOString(),
          });
          showToast(`Sesi fokus selesai: +${pendingSession.duration * 2} XP!`);
          fetchDashboardData();
          window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
        } catch (e) {
          console.error("Auto-save failed", e);
        } finally {
          clearPendingSession();
        }
      };
      autoSave();
    }
  }, [pendingSession, fetchDashboardData, clearPendingSession]);

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
      <div className="flex items-center justify-center w-full h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-on-surface-variant tracking-wider uppercase animate-pulse">Memuat telemetry module...</p>
        </div>
      </div>
    );
  }

  const displayedTasks = tasks.filter(t => taskFilter === 'priority' ? t.priority === 'high' || t.priority === 'critical' : true).slice(0, 5);
  const liveTasksCompleted = tasks.length > 0 ? tasks.filter(t => t.is_completed).length : (analytics?.today?.tasksCompleted || 0);
  const liveTasksTotal = tasks.length > 0 ? tasks.length : (analytics?.today?.tasksTotal || 0);
  const liveTaskPercent = liveTasksTotal > 0 ? Math.round((liveTasksCompleted / liveTasksTotal) * 100) : 0;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
{/* Toast */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-white/10 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 transform flex items-center gap-2.5 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
        <span className="text-xs font-mono font-medium">{toastMessage}</span>
      </div>

      
      {/* BARIS 1: Banner & Stats */}
{/* TOP HERO & COGNITIVE TELEMETRY STATUS */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Narrative */}
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container font-mono text-[11px] font-semibold text-secondary uppercase tracking-wider border border-neutral-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {user?.workspace_name || `${user?.name || 'My'}'s Command Deck`}
              </span>
              <span className="text-outline/40">•</span>
              <span className="font-mono text-xs text-on-surface-variant">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-neutral-800/50 font-mono text-[11px]">
                <span className="text-on-surface-variant font-medium">PLAN</span>
                <span className="text-outline/40">→</span>
                <span className="text-primary font-semibold">LEARN</span>
                <span className="text-outline/40">→</span>
                <span className="text-secondary font-semibold">BUILD</span>
                <span className="text-outline/40">→</span>
                <span className="text-tertiary font-semibold">COMPETE</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                Halo, {user?.name || 'Operator'}.
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-xl">
                Pelan-pelan, satu langkah hari ini tetap membawa kamu lebih dekat ke versi terbaikmu. Momentum kognitifmu berada di level optimal.
              </p>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => navigate('/today')}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-500/30"
              >
                <span className="material-symbols-outlined text-[18px]">checklist</span>
                <span>Buka Task Harian</span>
              </button>

              {/* Focus Button Connected to Today Timer */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (isFocusActive) {
                      if (isFocusPaused) {
                        resumeTimer();
                      } else {
                        pauseTimer();
                      }
                    } else {
                      startTimer(25);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isFocusActive
                      ? isFocusPaused
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                        : 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/25'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-neutral-800/50'
                  }`}
                  title={isFocusActive ? (isFocusPaused ? "Lanjutkan Sprint" : "Jeda Sprint") : "Mulai 25m Focus Sprint (Sinkron dengan Today)"}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isFocusActive && !isFocusPaused ? 'animate-pulse text-secondary' : isFocusPaused ? 'text-amber-400' : 'text-secondary'}`}>
                    {isFocusActive ? (isFocusPaused ? 'play_arrow' : 'pause') : 'play_arrow'}
                  </span>
                  <span>
                    {isFocusActive
                      ? `${formatTimer()} • ${isFocusPaused ? 'Resume' : 'Pause'}`
                      : 'Mulai Fokus'}
                  </span>
                </button>

                {isFocusActive && (
                  <button
                    onClick={() => stopTimer()}
                    className="px-2.5 py-2 rounded-lg bg-surface-container hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 border border-neutral-800/50 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="Selesaikan / Hentikan Sesi Sprint"
                  >
                    <span className="material-symbols-outlined text-[16px]">stop</span>
                    <span className="hidden sm:inline">Selesai</span>
                  </button>
                )}
              </div>

              {/* Linked Target Stat (Connected to Timer in Today) */}
              <div
                onClick={() => navigate('/today#focus-sprint-section')}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container/60 hover:bg-surface-container hover:border-secondary/40 transition-all cursor-pointer border border-neutral-800/50 group"
                title="Buka Timer Focus Sprint di menu Today"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined text-[15px] ${isFocusActive ? 'text-secondary animate-pulse' : 'text-secondary'}`}>
                    {isFocusActive ? 'timer' : 'bolt'}
                  </span>
                  <span className="font-mono text-xs text-on-surface">
                    Target: 4j 00m (Selesai: {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m)
                  </span>
                </div>
                {isFocusActive && (
                  <span className="text-secondary font-bold font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary/15">
                    {formatTimer()}
                  </span>
                )}
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60 group-hover:text-secondary group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>

          {/* Right Gamified Gauge */}
          <div
            onClick={() => navigate('/progress')}
            className="flex-shrink-0 self-start lg:self-center p-4 rounded-xl bg-surface-container/80 border border-neutral-800/50 flex items-center gap-4 min-w-[270px] cursor-pointer hover:bg-surface-container transition-colors"
          >
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container-highest fill-none" cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="7"></circle>
                <circle
                  className="text-primary fill-none"
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
                <span className="material-symbols-outlined text-secondary text-[16px]">bolt</span>
                <span className="font-bold text-base text-on-surface leading-none">{analytics?.user?.xp || 0}</span>
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider mt-0.5">XP</span>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary-container/30 text-primary uppercase tracking-wider border border-primary/20">
                  Lvl {Math.floor((analytics?.user?.xp || 0) / 100) + 1}
                </span>
                <span className="text-xs font-semibold text-on-surface">Scholar</span>
              </div>
              <p className="text-xs text-on-surface-variant truncate">{100 - ((analytics?.user?.xp || 0) % 100)} XP ke Level {Math.floor((analytics?.user?.xp || 0) / 100) + 2}</p>
              <div className="pt-0.5 flex items-center gap-1.5 text-secondary text-xs font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>+{analytics?.today?.tasksCompleted * 10 || 0} XP Hari ini</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      
{/* QUICK STATS TELEMETRY GRID - ALL INTER-LINKED */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Tasks (Linked to Today & Tasks) */}
        <div 
          onClick={() => navigate('/today')}
          className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between cursor-pointer group shadow-none"
          title="Buka Today's Command Deck"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1 transition-colors">
                TASK SELESAI
                <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                {liveTasksCompleted}/{liveTasksTotal}
              </span>
              <span className="text-xs font-sans text-secondary font-semibold">
                {liveTaskPercent}%
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${liveTaskPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="truncate">{liveTasksCompleted} target selesai</span>
            </div>
            <span className="text-secondary font-sans text-[11px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Today →
            </span>
          </div>
        </div>

        {/* Stat 2: Study Time (Linked to Focus / Study Space) */}
        <div 
          onClick={() => navigate('/today')}
          className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between cursor-pointer group shadow-none"
          title="Buka Sesi Fokus di Today"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1 transition-colors">
                WAKTU FOKUS
                <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">
                {Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60)}j {(analytics?.today?.focusTimeMinutes || 0) % 60}m
              </span>
              <span className="text-xs font-sans text-primary font-semibold">
                {Math.round(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100)}%
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((analytics?.today?.focusTimeMinutes || 0) / 240) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5 truncate">
              {isFocusActive ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                  <span className="text-secondary font-semibold font-mono text-[11px] truncate">
                    Sprint: {formatTimer()} ({isFocusPaused ? 'Paused' : 'Running'})
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px] text-primary">flag</span>
                  <span className="truncate">Target: 4j 00m</span>
                </>
              )}
            </div>
            <span className="text-primary font-sans text-[11px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Sprint →
            </span>
          </div>
        </div>

        {/* Stat 3: Streak (Linked to Progress / Profile) */}
        <div 
          onClick={() => navigate('/progress')}
          className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between cursor-pointer group shadow-none"
          title="Buka Telemetri Pertumbuhan di Profile"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1 transition-colors">
                STREAK HARIAN
                <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-tertiary transition-colors">
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans tracking-tight text-on-surface">{analytics?.user?.streak || 0} Hari</span>
              <span className="text-xs font-sans text-tertiary font-semibold">
                {analytics?.user?.streak > 0 ? 'AKTIF' : 'INAKTIF'}
              </span>
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-tertiary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((analytics?.user?.streak || 0) / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${analytics?.user?.streak > 0 ? 'bg-tertiary' : 'bg-outline'}`}></span>
              <span className="truncate">{analytics?.user?.streak > 0 ? 'Momentum terjaga' : 'Mulai fokus'}</span>
            </div>
            <span className="text-tertiary font-sans text-[11px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Profil →
            </span>
          </div>
        </div>

        {/* Stat 4: Next Countdown (Linked to Crucial Deadlines & Tasks) */}
        <div 
          onClick={() => navigate('/today')}
          className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between cursor-pointer group shadow-none"
          title="Lihat Detail Crucial Deadlines"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-outline group-hover:text-primary uppercase flex items-center gap-1 transition-colors">
                DEADLINE TERDEKAT
                <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans tracking-tight text-secondary">
                {crucialDeadlines.length > 0 ? crucialDeadlines[0].countdown : '-'}
              </span>
              {crucialDeadlines.length > 0 && (
                <span className="text-xs font-mono font-semibold text-outline">
                  {crucialDeadlines[0].dateStr}
                </span>
              )}
            </div>
            <div className="mt-3 w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: crucialDeadlines.length > 0 ? '75%' : '0%' }}
              />
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-on-surface-variant">
            <span className="truncate max-w-[140px]">
              {crucialDeadlines.length > 0 ? crucialDeadlines[0].title : 'Tidak ada tenggat'}
            </span>
            <span className="text-secondary font-sans text-[11px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Today →
            </span>
          </div>
        </div>
      </section>

      {/* BARIS 2: Fokus Harian Sejajar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
{/* TASKS */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Today's Mission</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">{tasks.filter(t => !t.is_completed).length} dari {tasks.length} target harian tersisa</p>
                </div>
              </div>
              <div className="flex items-center p-1 rounded-lg bg-surface-container border border-neutral-800/50 text-xs">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${taskFilter === 'all' ? 'bg-surface-container-high text-on-surface' : 'text-outline hover:text-on-surface'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setTaskFilter('priority')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${taskFilter === 'priority' ? 'bg-surface-container-high text-on-surface' : 'text-outline hover:text-on-surface'}`}
                >
                  Prioritas
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {displayedTasks.length > 0 ? (
                displayedTasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg transition-colors flex items-start justify-between gap-3 ${task.is_completed
                        ? 'bg-surface-container/40 opacity-60'
                        : 'bg-surface-container hover:bg-surface-container-high/80'
                      }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_completed, task.xp)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${task.is_completed
                            ? 'bg-secondary text-on-secondary font-bold'
                            : 'bg-surface-container-high text-transparent hover:text-secondary border-0'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">done</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.is_completed ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-surface-container-highest text-on-surface-variant">
                              DONE
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${task.priority === 'high' || task.priority === 'critical'
                                ? 'bg-error-container/30 text-error'
                                : task.priority === 'medium'
                                  ? 'bg-tertiary-container/30 text-tertiary'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              }`}>
                              {task.priority || 'NORMAL'}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-primary-container/20 text-primary">
                            {task.category || 'General'}
                          </span>
                        </div>
                        <h3 className={`mt-1 text-sm ${task.is_completed ? 'font-normal text-on-surface-variant line-through truncate' : 'font-medium text-on-surface truncate'}`}>
                          {task.title}
                        </h3>
                        {!task.is_completed && task.description && (
                          <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-secondary">
                      <span className="text-xs font-mono font-semibold">+{task.xp}XP</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-surface-container/30 rounded-lg flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-outline/60 text-[32px] mb-1.5">task</span>
                  <p className="text-xs text-outline font-medium">Belum ada task aktif hari ini.</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-800/50"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Tambah Task</span>
              </button>
              <button
                onClick={() => navigate('/today')}
                className="py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-neutral-800/50"
                title="Buka Jadwal Hari Ini di Today"
              >
                <span>Today</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-neutral-800/50"
                title="Buka Backlog Lengkap di Tasks"
              >
                <span>Backlog Tasks</span>
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              </button>
            </div>
          </div>

          
{/* DAILY RITUALS */}
          <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20">
                  <span className="material-symbols-outlined text-[20px]">vital_signs</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface tracking-tight">Daily Rituals</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                      rituals.filter(r => r.is_completed).length === rituals.length && rituals.length > 0
                        ? 'bg-secondary/20 text-secondary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      {rituals.filter(r => r.is_completed).length} / {rituals.length} Done
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowRitualModal(true)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-secondary/20 text-on-surface-variant hover:text-secondary flex items-center justify-center transition-colors cursor-pointer border border-neutral-800/50"
                title="Tambah Ritual"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {rituals.length > 0 ? (
                rituals.map(ritual => (
                  <div
                    key={ritual.id}
                    className={`group flex items-center gap-2 p-3 rounded-xl transition-all ${
                      ritual.is_completed
                        ? 'bg-secondary/8 border border-secondary/15'
                        : 'bg-surface-container border border-transparent hover:border-neutral-800/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleRitual(ritual.id)}
                      className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all cursor-pointer ${
                        ritual.is_completed
                          ? 'bg-secondary border-secondary text-on-secondary'
                          : 'border-outline hover:border-secondary'
                      }`}
                    >
                      {ritual.is_completed && <span className="material-symbols-outlined text-[13px] font-bold">check</span>}
                    </button>

                    {/* Inline Edit or Title */}
                    {editingRitualId === ritual.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editRitualTitle}
                          onChange={e => setEditRitualTitle(e.target.value)}
                          className="flex-1 bg-surface-container-high border border-secondary/30 text-on-surface px-2 py-1 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-secondary"
                          autoFocus
                          onKeyDown={async e => {
                            if (e.key === 'Enter') {
                              await updateRitual(ritual.id, editRitualTitle, editRitualTarget);
                              setEditingRitualId(null);
                            } else if (e.key === 'Escape') {
                              setEditingRitualId(null);
                            }
                          }}
                        />
                        <input
                          type="number"
                          value={editRitualTarget}
                          onChange={e => setEditRitualTarget(parseInt(e.target.value) || 30)}
                          className="w-14 bg-surface-container-high border border-secondary/30 text-on-surface px-2 py-1 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-secondary"
                          min={1}
                        />
                        <span className="text-xs text-outline">m</span>
                        <button
                          onClick={async () => {
                            await updateRitual(ritual.id, editRitualTitle, editRitualTarget);
                            setEditingRitualId(null);
                          }}
                          className="w-6 h-6 rounded bg-secondary/20 text-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/40 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </button>
                        <button
                          onClick={() => setEditingRitualId(null)}
                          className="w-6 h-6 rounded bg-surface-container text-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    ) : confirmDeleteRitualId === ritual.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-error font-medium">Hapus ritual ini?</span>
                        <button
                          onClick={() => { deleteRitual(ritual.id); setConfirmDeleteRitualId(null); }}
                          className="px-2 py-0.5 rounded bg-error/20 text-error text-xs font-semibold cursor-pointer hover:bg-error/30"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          onClick={() => setConfirmDeleteRitualId(null)}
                          className="px-2 py-0.5 rounded bg-surface-container text-outline text-xs cursor-pointer hover:bg-surface-container-high"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm font-medium truncate ${ritual.is_completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                          {ritual.title}
                        </span>
                        {/* Action Buttons - visible on hover */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingRitualId(ritual.id);
                              setEditRitualTitle(ritual.title);
                              setEditRitualTarget(ritual.target_minutes);
                            }}
                            className="w-6 h-6 rounded bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteRitualId(ritual.id)}
                            className="w-6 h-6 rounded bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                        </div>
                        {/* Timer Button */}
                        <button
                          onClick={() => startTimer(ritual.target_minutes, ritual.title)}
                          className="flex items-center gap-1 text-on-surface-variant hover:text-secondary transition-colors cursor-pointer flex-shrink-0"
                          title={`Start ${ritual.target_minutes}m Sprint`}
                        >
                          <span className="material-symbols-outlined text-[15px]">play_circle</span>
                          <span className="text-[11px] font-mono">{ritual.target_minutes}m</span>
                        </button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-5 text-center text-outline text-xs italic">
                  Belum ada ritual harian. Klik + untuk menambahkan.
                </div>
              )}
            </div>
          </div>

          
      </div>

      {/* BARIS 3: Ambis & Progres */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Kolom Kiri */}
        <div className="xl:col-span-8 space-y-8">
{/* ACTIVE PROJECTS */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Active Projects & Builds</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">{projects.length} artefak dalam jalur kompilasi</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/projects')}
                className="text-xs font-medium text-primary hover:text-primary-fixed transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Semua Proyek <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {projects.length > 0 ? (
                projects.slice(0, 4).map((project, idx) => (
                  <div key={project.id} className="p-4 rounded-lg bg-surface-container space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {project.logo_url && <img src={project.logo_url} alt="Logo" className="w-5 h-5 rounded bg-surface-container-high object-contain p-0.5" />}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${idx % 2 === 0 ? 'bg-secondary-container/20 text-secondary' : 'bg-primary-container/20 text-primary'}`}>
                          {project.category || 'PROJECT'}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-on-surface-variant font-semibold">{project.progress_percent || 0}% Done</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface truncate">{project.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{project.description || 'Tidak ada deskripsi tambahan'}</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx % 2 === 0 ? 'bg-secondary' : 'bg-primary'}`}
                        style={{ width: `${project.progress_percent || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-outline pt-0.5">
                      <span>Status: {project.status}</span>
                      <div className="flex items-center gap-2 text-on-surface-variant">
                          {project.repo_url && (
                            <a href={project.repo_url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors" title="Repository">
                              <span className="material-symbols-outlined text-[16px]">code</span>
                            </a>
                          )}
                          {project.design_url && (
                            <a href={project.design_url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors" title="Design">
                              <span className="material-symbols-outlined text-[16px]">design_services</span>
                            </a>
                          )}
                          {project.demo_url && (
                            <a href={project.demo_url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors" title="Live Demo">
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            </a>
                          )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 py-8 text-center bg-surface-container/30 rounded-lg flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-outline/60 text-[32px] mb-1.5">construction</span>
                  <p className="text-xs text-outline font-medium">Belum ada project aktif.</p>
                </div>
              )}
            </div>
          </div>

          
{/* ACTIVE COMPETITIONS */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">trophy</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Active Competitions</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Tantangan kompetitif yang sedang dikejar</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/competitions')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-neutral-800/50 text-xs font-medium transition-colors cursor-pointer"
              >
                <span>Ke Workspace</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-3">
              {competitions.length > 0 ? (
                competitions.slice(0, 4).map((comp) => {
                  const info = parseCompInfo(comp);
                  return (
                    <div
                      key={comp.id}
                      onClick={() => navigate('/competitions')}
                      className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer border border-neutral-800/40 space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-tertiary-container/30 text-tertiary border border-tertiary/20">
                          {comp.status || 'Active'}
                        </span>
                        <span className="text-xs font-mono font-semibold text-secondary px-2 py-0.5 rounded bg-surface-container-highest">
                          {info.daysRemaining}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-on-surface group-hover:text-tertiary transition-colors truncate">
                          {comp.title}
                        </h4>
                        <p className="text-xs text-outline mt-0.5">
                          Prize Pool: <span className="text-on-surface font-semibold">{formatRupiah(info.prizePool)}</span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                          <span>Persyaratan Progress</span>
                          <span className="font-semibold text-tertiary">{info.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                          <div
                            className="h-full bg-tertiary rounded-full transition-all duration-500"
                            style={{ width: `${info.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center bg-surface-container/30 rounded-lg flex flex-col items-center justify-center border border-neutral-800/40">
                  <span className="material-symbols-outlined text-outline/60 text-[32px] mb-1.5">emoji_events</span>
                  <p className="text-xs text-outline font-medium">Belum ada kompetisi aktif.</p>
                </div>
              )}
            </div>
          </div>
        
{/* REKOMENDASI BIMBEL */}
      <section className="space-y-4 pt-2 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container text-secondary font-mono text-[11px] font-semibold uppercase tracking-wider border border-white/5">
              <span className="material-symbols-outlined text-[14px]">school</span>
              <span>PROGRAM REKOMENDASI</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">Rekomendasi Bimbel</h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">Akses bimbingan belajar terbaik untuk mempercepat pencapaian target ambisimu.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handlePrevCarousel}
              className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-white/5"
              title="Sebelumnya"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleNextCarousel}
              className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-white/5"
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
                className="relative group overflow-hidden rounded-xl bg-surface-container-low border border-white/5 hover:border-white/10 flex flex-col h-72 transition-all duration-200"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${item.img}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent"></div>

                {/* Header Tag */}
                <div className="relative z-10 flex items-center justify-between p-4">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-surface-container-lowest/80 backdrop-blur-md ${item.badgeColor} border border-white/10`}>
                    {item.badge}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showToast(`Bimbel disimpan: ${item.title}`);
                    }}
                    className="w-8 h-8 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md text-on-surface hover:text-secondary flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Simpan Rekomendasi"
                  >
                    <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  </button>
                </div>

                {/* Footer Info */}
                <div className="relative z-10 mt-auto p-4 space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-on-surface group-hover:text-secondary transition-colors">{item.title}</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{item.desc}</p>
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast(`Membuka: ${item.title}`);
                      }}
                      className={`inline-flex items-center gap-1 font-semibold ${item.color} hover:underline transition-all group-hover:translate-x-0.5 duration-200 cursor-pointer`}
                    >
                      {item.actionText}
                    </button>
                    <span className="text-[11px] font-mono text-outline px-2 py-0.5 rounded-md bg-surface-container/80 border border-white/5">
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
        className="p-5 rounded-xl bg-surface-container-low border border-white/5 hover:bg-surface-container-low/90 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Accelerate Your Vision</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Konsistensi kecil yang berulang setiap hari menghasilkan kemajuan eksponensial.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block font-mono">
            <span className="text-[11px] font-semibold text-on-surface uppercase tracking-wider block">Engine Status</span>
            <span className="text-xs text-secondary font-medium">Session Optimized</span>
          </div>
          <button className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors border border-white/5">
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      
        </div>

        {/* Kolom Kanan */}
        <div className="xl:col-span-4 space-y-6">
{/* GOALS & VISION */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">flag</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Goals & Vision</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">North-star arah pembelajaran</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/goals')}
                className="text-xs font-medium text-primary hover:text-primary-fixed transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Semua Target <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {goals.length > 0 ? (
                goals.slice(0, 5).map(goal => (
                  <div
                    key={goal.id}
                    onClick={() => navigate('/goals')}
                    className="p-3.5 rounded-lg bg-surface-container space-y-2 hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate mr-2">
                        <span className="material-symbols-outlined text-primary text-[16px]">flag</span>
                        <span className="text-xs font-semibold text-on-surface truncate">{goal.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface-container-highest text-on-surface whitespace-nowrap">
                        {goal.category || 'Goal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-on-surface-variant text-[11px]">Progress</span>
                      <span className="text-primary font-semibold">{goal.progress_percentage}% Selesai</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${goal.progress_percentage}%` }}></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-surface-container/30 rounded-lg flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-outline/60 text-[32px] mb-1.5">flag</span>
                  <p className="text-xs text-outline font-medium">Belum ada target jangka panjang.</p>
                </div>
              )}
            </div>
          </div>
        
{/* CRUCIAL DEADLINES WIDGET */}
          <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[18px]">crisis_alert</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Crucial Deadlines</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Deadline 7 hari ke depan</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
            </div>

            <div className="space-y-2">
              {crucialDeadlines.length > 0 ? (
                crucialDeadlines.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/today')}
                    className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between gap-3 border border-neutral-800/40 hover:bg-surface-container-high transition-all cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            item.source === 'LOMBA'
                              ? 'bg-tertiary-container/30 text-tertiary border border-tertiary/30'
                              : item.source === 'GOAL'
                              ? 'bg-primary-container/30 text-primary border border-primary/30'
                              : 'bg-error-container/30 text-error border border-error/30'
                          }`}
                        >
                          {item.source}
                        </span>
                        <span className="text-[11px] text-outline font-mono">{item.dateStr}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-on-surface truncate">{item.title}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-surface-container-highest text-on-surface font-mono font-bold text-xs border border-neutral-800/50 flex-shrink-0">
                      {item.countdown}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center bg-surface-container/30 rounded-xl border border-neutral-800/40">
                  <span className="material-symbols-outlined text-outline/60 text-[28px] mb-1">done_all</span>
                  <p className="text-xs text-outline font-mono">Tidak ada deadline krusial dalam 7 hari.</p>
                </div>
              )}
            </div>
          </div>

          
{/* AUDIO SANCTUARY */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-on-surface tracking-tight">Audio Sanctuary</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Binaural Beats & Ambience</p>
                </div>
              </div>
              <button
                onClick={() => setIsAudioModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-neutral-800/50 text-xs font-mono text-secondary hover:text-secondary-fixed transition-colors cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full bg-secondary ${isPlayingBinaural ? 'animate-pulse' : ''}`}></span>
                <span>432Hz Live</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-container space-y-1">
              <p className="text-xs italic text-on-surface leading-relaxed">
                “Consistency is the silent architecture of true mastery.”
              </p>
              <span className="block text-[11px] font-mono text-outline">— Ambis Mindset Principle</span>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-container/60 border border-neutral-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPlayingBinaural ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-highest text-outline'}`}>
                  <span className="material-symbols-outlined text-[18px]">{isPlayingBinaural ? 'volume_up' : 'headphones'}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-on-surface truncate">Deep Alpha Waves (432Hz)</h4>
                  <p className="text-[11px] font-mono text-on-surface-variant">Sirkuit Pemrograman Mendalam</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsAudioModalOpen(true)}
                  className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
                  title="Pengaturan Audio"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                </button>
                <button
                  onClick={toggleBinaural}
                  className="w-9 h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary-fixed transition-colors cursor-pointer font-bold shadow-sm"
                  title={isPlayingBinaural ? "Pause Audio" : "Play Audio"}
                >
                  <span className="material-symbols-outlined text-[20px]">{isPlayingBinaural ? 'pause' : 'play_arrow'}</span>
                </button>
              </div>
            </div>
          </div>

          
        </div>
      </div>

{/* QUICK ADD TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-low p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-white/10 relative space-y-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">add_task</span>
              Quick Add Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <input
                required
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                type="text"
                className="w-full bg-surface-container border border-white/5 focus:border-secondary/50 text-on-surface placeholder:text-outline p-3 rounded-xl focus:outline-none text-xs"
                placeholder="Deskripsi tugas cepat..."
                autoFocus
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/5 text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-semibold transition-colors cursor-pointer"
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
          <div className="bg-surface-container-low p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-white/10 relative space-y-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[20px]">emoji_events</span>
              Tambah Target Kompetisi
            </h2>
            <form onSubmit={handleCreateComp} className="space-y-4">
              <input
                required
                value={newCompTitle}
                onChange={e => setNewCompTitle(e.target.value)}
                type="text"
                className="w-full bg-surface-container border border-white/5 focus:border-tertiary/50 text-on-surface placeholder:text-outline p-3 rounded-xl focus:outline-none text-xs"
                placeholder="Nama Hackathon / Lomba..."
                autoFocus
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/5 text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QUICK ADD RITUAL MODAL */}
      {showRitualModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-low p-6 rounded-2xl max-w-md w-full shadow-2xl flex flex-col border border-white/10 relative space-y-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">pulse</span>
              Tambah Daily Ritual
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const success = await addRitual(newRitualTitle, newRitualTarget);
              if (success) {
                setShowRitualModal(false);
                setNewRitualTitle('');
                setNewRitualTarget(30);
              }
            }} className="space-y-4">
              <input required value={newRitualTitle} onChange={e => setNewRitualTitle(e.target.value)} type="text" className="w-full bg-surface-container border border-white/5 focus:border-secondary/50 text-on-surface placeholder:text-outline p-3 rounded-xl focus:outline-none text-xs" placeholder="Nama Ritual (ex: Belajar Bahasa Inggris)..." autoFocus />
              <input required value={newRitualTarget} onChange={e => setNewRitualTarget(parseInt(e.target.value) || 30)} type="number" min="1" className="w-full bg-surface-container border border-white/5 focus:border-secondary/50 text-on-surface placeholder:text-outline p-3 rounded-xl focus:outline-none text-xs" placeholder="Estimasi Menit (ex: 30)" />
              <div className="flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowRitualModal(false)} className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/5 text-xs font-medium transition-colors cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-semibold transition-colors cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
