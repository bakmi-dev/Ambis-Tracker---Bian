import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { taskApi, analyticsApi, studySessionApi, competitionApi } from "../api";
import { useFocusTimer } from "../context/FocusTimerContext";
import { useDailyRituals } from "../context/RitualContext";

interface ChecklistTask {
  id: string;
  priority: "HIGH" | "MED" | "LOW";
  duration: string;
  estimatedMinutes: number;
  category: string;
  title: string;
  description?: string;
  xp: number;
  completed: boolean;
  due_date?: string;
}

interface Deadline {
  id: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  time: string;
  timeRemaining: string;
  title: string;
  description: string;
}

const Today = () => {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const { rituals, toggleRitual, addRitual, updateRitual, deleteRitual } = useDailyRituals();
  const [editingRitualId, setEditingRitualId] = useState<string | null>(null);
  const [editRitualTitle, setEditRitualTitle] = useState('');
  const [editRitualTarget, setEditRitualTarget] = useState(30);
  const [confirmDeleteRitualId, setConfirmDeleteRitualId] = useState<string | null>(null);

  // Tasks from backend
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // Fetch tasks for today
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const today = new Date().toISOString().split("T")[0];
      const res = await taskApi.getAll({ date: today });
      const dataArr = Array.isArray(res.data) ? res.data : [];
      const mapped: ChecklistTask[] = dataArr.map((t: any) => ({
        id: t.id,
        priority: (t.priority || "medium").toUpperCase() as
          "HIGH" | "MED" | "LOW",
        duration: `~${t.estimated_minutes || 25}m`,
        estimatedMinutes: t.estimated_minutes || 25,
        category: t.category || "General",
        title: t.title,
        description: t.description || undefined,
        xp: t.xp || 10,
        completed: t.is_completed,
        due_date: t.due_date,
      }));

      // Sort to put overdue tasks at the top
      const todayStr = new Date().toISOString().split("T")[0];
      mapped.sort((a, b) => {
        const aOverdue = !a.completed && a.due_date && a.due_date.split("T")[0] < todayStr;
        const bOverdue = !b.completed && b.due_date && b.due_date.split("T")[0] < todayStr;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return 0;
      });

      setChecklistTasks(mapped);
    } catch (err: any) {
      setError(err.message || "Gagal memuat tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await analyticsApi.getSummary();
      setAnalytics(res.data);
    } catch {
      // Silently fail for analytics
    }
  }, []);

  // Listen for task synchronization across overview pages
  useEffect(() => {
    const handleSync = () => {
      fetchTasks();
      fetchAnalytics();
    };
    window.addEventListener('ambis:tasks-updated', handleSync);
    return () => window.removeEventListener('ambis:tasks-updated', handleSync);
  }, [fetchTasks, fetchAnalytics]);

  // Handle hash scrolling to sprint section from Dashboard
  useEffect(() => {
    if (window.location.hash === '#focus-sprint-section') {
      setTimeout(() => {
        const el = document.getElementById('focus-sprint-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  }, []);
  // Fetch deadlines (Tasks & Competitions H-1 to H-3)
  const fetchDeadlines = useCallback(async () => {
    try {
      // Get all tasks and competitions
      const [taskRes, compRes] = await Promise.all([
        taskApi.getAll(), 
        competitionApi.getAll() // Note: assuming this gets all upcoming
      ]);
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const items: Deadline[] = [];

      // Process Tasks
      if (taskRes.success) {
        taskRes.data.forEach((t: any) => {
          if (!t.is_completed && t.due_date) {
            const due = new Date(t.due_date);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 1 && diffDays <= 3) {
              items.push({
                id: `task-${t.id}`,
                icon: "task",
                colorClass: "text-secondary",
                bgClass: "bg-secondary-container",
                time: due.toLocaleDateString(),
                timeRemaining: diffDays === 1 ? "Besok" : `${diffDays} hari lagi`,
                title: t.title,
                description: `Tugas • Prioritas: ${t.priority || "MED"}`,
              });
            }
          }
        });
      }

      // Process Competitions
      if (compRes.success) {
        compRes.data.forEach((c: any) => {
          if (c.date) {
            const due = new Date(c.date);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 1 && diffDays <= 3) {
              items.push({
                id: `comp-${c.id}`,
                icon: "emoji_events",
                colorClass: "text-primary",
                bgClass: "bg-primary-container",
                time: due.toLocaleDateString(),
                timeRemaining: diffDays === 1 ? "Besok" : `${diffDays} hari lagi`,
                title: c.title,
                description: `Kompetisi • Tingkat: ${c.level || "Regional"}`,
              });
            }
          }
        });
      }

      // Sort by nearest deadline
      items.sort((a, b) => {
        const getDays = (str: string) => str === "Besok" ? 1 : parseInt(str.split(" ")[0]);
        return getDays(a.timeRemaining) - getDays(b.timeRemaining);
      });

      setDeadlines(items.slice(0, 5)); // Limit to 5 items
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchAnalytics();
    fetchDeadlines();
  }, [fetchTasks, fetchAnalytics, fetchDeadlines]);

  const toggleTask = async (id: string) => {
    const task = checklistTasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    setChecklistTasks((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: !task.completed } : t)),
    );

    try {
      await taskApi.update(id, { is_completed: !task.completed });
      window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
      fetchAnalytics(); // refresh XP/stats
    } catch {
      // Revert on error
      setChecklistTasks((tasks) =>
        tasks.map((t) =>
          t.id === id ? { ...t, completed: task.completed } : t,
        ),
      );
    }
  };


  const { 
    isActive, isPaused, timeLeft, initialDuration, currentTopic, 
    startTimer, pauseTimer, resumeTimer, stopTimer, formatTimer,
    setCustomDuration,
    pendingSession, clearPendingSession
  } = useFocusTimer();

  // If a session finishes, we could automatically log it if we wanted, or prompt the user.
  // The user requested: "Saat sprint selesai ... Tambahkan akumulasi menit fokus ... Tambahkan 1 sesi ke metrik ... Simpan log sesi ke Neon Tech dan berikan perolehan XP."
  // Since pendingSession will be populated when a session finishes, we can use a useEffect to auto-save it!
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
          fetchAnalytics();
        } catch (e) {
          console.error("Auto-save failed", e);
        } finally {
          clearPendingSession();
        }
      };
      autoSave();
    }
  }, [pendingSession, fetchAnalytics, clearPendingSession]);

  // Modals
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState("45");
  const [customTopicInput, setCustomTopicInput] = useState("");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    category: "Study",
    priority: "high",
    estimatedMinutes: "30",
  });

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [studyForm, setStudyForm] = useState({
    duration: 45,
    subject: "",
    notes: "",
  });

  const [isRitualModalOpen, setIsRitualModalOpen] = useState(false);
  const [ritualForm, setRitualForm] = useState({
    title: "",
    targetMinutes: 30,
  });

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await taskApi.create({
        title: taskForm.title,
        category: taskForm.category,
        priority: taskForm.priority,
        estimated_minutes: parseInt(taskForm.estimatedMinutes) || 30,
        due_date: today,
      });
      setIsTaskModalOpen(false);
      setTaskForm({
        title: "",
        category: "Study",
        priority: "high",
        estimatedMinutes: "30",
      });
      window.dispatchEvent(new CustomEvent('ambis:tasks-updated'));
      fetchTasks();
      fetchAnalytics();
      fetchDeadlines(); // deadlines might include tasks
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateRitual = async () => {
    if (!ritualForm.title) return;
    try {
      const success = await addRitual(ritualForm.title, ritualForm.targetMinutes);
      if (success) {
        setIsRitualModalOpen(false);
        setRitualForm({ title: "", targetMinutes: 30 });
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleLogStudy = async () => {
    if (!studyForm.subject || !studyForm.duration) return;
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - studyForm.duration * 60000);
      await studySessionApi.create({
        title: studyForm.subject + (studyForm.notes ? ` - ${studyForm.notes}` : ''),
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: studyForm.duration,
      });
      setIsStudyModalOpen(false);
      setStudyForm({ duration: 45, subject: "", notes: "" });
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  // Computed stats from analytics or tasks
  const todayTasksCompleted = checklistTasks.filter((t) => t.completed).length;
  const todayTasksTotal = checklistTasks.length;
  const taskPercent =
    todayTasksTotal > 0
      ? Math.round((todayTasksCompleted / todayTasksTotal) * 100)
      : 0;
  const xp = analytics?.user?.xp || 0;
  const streak = analytics?.user?.streak || 0;
  const focusMinutes = analytics?.today?.focusTimeMinutes || 0;
  const focusHours = Math.floor(focusMinutes / 60);
  const focusMins = focusMinutes % 60;

  return (
    <div className="flex flex-col w-full space-y-6 sm:space-y-8 max-w-7xl mx-auto pt-6 sm:pt-8 pb-12">
      {/* Top Command Status & Priming Header */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 border border-neutral-800/50 shadow-none">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-secondary font-mono text-xs font-semibold uppercase tracking-widest border border-neutral-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold tracking-wide">
                <span className="material-symbols-outlined text-[15px]">
                  bolt
                </span>
                COGNITIVE RESONANCE: 94%
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-sans font-medium transition-colors border border-neutral-800/40 cursor-pointer"
                title="Buka Ringkasan Dashboard"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">dashboard</span>
                Dashboard Overview →
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-sans font-medium transition-colors border border-neutral-800/40 cursor-pointer"
                title="Buka Backlog Tasks Engine"
              >
                <span className="material-symbols-outlined text-[14px] text-primary">checklist</span>
                Backlog Tasks →
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-sans text-on-surface tracking-tight leading-tight">
              Today's Command: High Resonance & Deep Work
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0">
                format_quote
              </span>
              <span className="italic text-on-surface">
                "Fokus pada proses, bukan kebisingan. 1 target besar bernilai 10 target kecil."
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-start xl:self-center">
            <button
              onClick={() => {
                startTimer(45);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold tracking-wider uppercase transition-all border border-neutral-800/40 shadow-none"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                graphic_eq
              </span>
              <span>432Hz Sprint (45m)</span>
            </button>
            <button
              onClick={() => setIsStudyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-semibold tracking-wider uppercase transition-all border border-neutral-800/40 shadow-none"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                menu_book
              </span>
              <span>Log Study Session</span>
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wider uppercase transition-all border border-purple-500/30 shadow-none active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_task
              </span>
              <span>+ Tambah Task Hari Ini</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Daily Telemetry Strip - ALL INTER-LINKED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Focus Time (Linked to Focus Sprint) */}
        <div 
          onClick={() => {
            const el = document.getElementById('focus-sprint-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="relative p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none overflow-hidden group min-h-[140px] cursor-pointer"
          title="Lihat Modul Focus Sprint"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold font-sans group-hover:text-primary transition-colors flex items-center gap-1">
              Focus Time Today
              <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                schedule
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-sans text-on-surface tracking-tight">
              {focusHours}j {focusMins}m
            </span>
            <span className="text-xs font-sans text-secondary font-bold">
              {focusMinutes > 0
                ? `${Math.min(Math.round((focusMinutes / 240) * 100), 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-secondary h-1.5 rounded-full transition-all duration-500 shadow-none"
              style={{ width: `${Math.min((focusMinutes / 240) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant font-normal">
            <span>Target: 4j 00m (Selesai: {focusHours}j {focusMins}m)</span>
            <span className="text-secondary font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
              Focus Sprint →
            </span>
          </div>
        </div>

        {/* Stat 2: Daily Tasks (Linked to Tasks Engine) */}
        <div 
          onClick={() => navigate('/tasks')}
          className="relative p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none overflow-hidden group min-h-[140px] cursor-pointer"
          title="Buka Tasks & Backlog Engine"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold font-sans group-hover:text-primary transition-colors flex items-center gap-1">
              Daily Tasks
              <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                task_alt
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-sans text-on-surface tracking-tight">
              {todayTasksCompleted}/{todayTasksTotal}
            </span>
            <span className="text-xs font-sans text-primary font-bold">
              {taskPercent}% Selesai
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500 shadow-none"
              style={{ width: `${taskPercent}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant font-normal">
            <span>{todayTasksCompleted} dari {todayTasksTotal} selesai</span>
            <span className="text-primary font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
              Tasks Backlog →
            </span>
          </div>
        </div>

        {/* Stat 3: Deep Work Blocks (Linked to Focus Sprint) */}
        <div 
          onClick={() => {
            const el = document.getElementById('focus-sprint-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="relative p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none overflow-hidden group min-h-[140px] cursor-pointer"
          title="Lihat Sesi & Modul Sprint"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold font-sans group-hover:text-primary transition-colors flex items-center gap-1">
              Deep Work Blocks
              <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-tertiary transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                psychology
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-sans text-on-surface tracking-tight">
              {analytics?.today?.sessionsCount || 0} Sesi
            </span>
            <span className="text-xs font-sans text-tertiary font-bold">
              Active
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            <span className="flex-1 h-1.5 rounded-full bg-purple-500/60"></span>
            <span className="flex-1 h-1.5 rounded-full bg-purple-500/40"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant font-normal">
            <span>{analytics?.today?.sessionsCount > 0 ? `${analytics.today.sessionsCount} sesi tercatat` : "Siklus deep work"}</span>
            <span className="text-tertiary font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
              Focus Sprint →
            </span>
          </div>
        </div>

        {/* Stat 4: Growth Velocity (Linked to Progress) */}
        <div 
          onClick={() => navigate('/progress')}
          className="relative p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 hover:border-purple-500/50 hover:bg-surface-container/60 transition-all flex flex-col justify-between shadow-none overflow-hidden group min-h-[140px] cursor-pointer"
          title="Buka Profile & Telemetri Pertumbuhan"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold font-sans group-hover:text-primary transition-colors flex items-center gap-1">
              Growth Velocity
              <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container group-hover:bg-purple-600/20 flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                stars
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold font-sans text-primary tracking-tight">
              +{xp} XP
            </span>
            <span className="text-xs font-sans text-primary font-bold">
              Streak: {streak}D
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((xp % 500) / 5, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant font-normal">
            <span>Level {Math.floor(xp / 100) + 1} Operator</span>
            <span className="text-primary font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
              Profile →
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN - Core Execution Checklist (Promoted to Top) */}
        <div className="lg:col-span-8 flex flex-col space-y-6 sm:space-y-8">
          {/* Actionable Tasks Checklist */}
          <div className="rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  checklist
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  Core Execution Checklist
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-medium px-3 py-1 rounded-full bg-surface-container">
                  {checklistTasks.filter((t) => t.completed).length} dari {checklistTasks.length} selesai
                </span>
                <button
                  onClick={() => navigate('/tasks')}
                  className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-primary hover:text-purple-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-neutral-800/40"
                  title="Kelola semua backlog task"
                >
                  <span>Buka di Tasks</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2 animate-spin">
                    progress_activity
                  </span>
                  <p className="text-sm text-outline">Memuat tasks...</p>
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-error text-[48px] mb-2">
                    error
                  </span>
                  <p className="text-sm text-error">{error}</p>
                  <button
                    onClick={fetchTasks}
                    className="mt-3 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : checklistTasks.length > 0 ? (
                checklistTasks.map((task) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isOverdue = !task.completed && !!task.due_date && task.due_date.split("T")[0] < todayStr;
                  const overdueDate = isOverdue ? new Date(task.due_date!).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) : "";

                  return (
                  <div
                    key={task.id}
                    className={`p-4 sm:p-5 rounded-xl transition-all flex items-start justify-between gap-4 group ${
                      task.completed
                        ? "bg-surface-container/50 hover:bg-surface-container"
                        : isOverdue 
                        ? "bg-error-container/10 border border-error/30 hover:bg-error-container/20"
                        : "bg-surface-container hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                          task.completed
                            ? "bg-primary border-primary text-on-primary"
                            : isOverdue
                            ? "border-error/40 bg-error-container text-error hover:border-error hover:bg-error hover:text-on-error"
                            : "border-outline/40 hover:border-primary text-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] font-bold">
                          check
                        </span>
                      </button>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-error text-on-error flex items-center gap-1 shadow-[0_0_10px_rgba(255,84,73,0.3)]">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              OVERDUE // {overdueDate}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                              task.completed
                                ? "bg-surface-container-highest text-outline"
                                : task.priority === "HIGH"
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-surface-container-highest text-outline"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <button
                            onClick={() => startTimer(task.estimatedMinutes, task.title)}
                            className="text-xs text-outline hover:text-secondary flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mulai Sprint untuk task ini"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              timer
                            </span>{" "}
                            {task.duration}
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              task.completed
                                ? "bg-surface-container-high text-outline"
                                : "bg-surface-container-highest text-secondary font-medium"
                            }`}
                          >
                            {task.category}
                          </span>
                        </div>
                        <div
                          className={`text-base ${
                            task.completed
                              ? "text-on-surface-variant line-through font-normal"
                              : "text-on-surface font-semibold"
                          }`}
                        >
                          {task.title}
                        </div>
                        {!task.completed && task.description && (
                          <p className="text-xs sm:text-sm text-on-surface-variant font-normal leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {task.completed ? (
                      <span className="text-xs font-semibold text-secondary px-2.5 py-1 rounded bg-surface-container-low flex-shrink-0">
                        +{task.xp} XP
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-lowest transition-colors"
                          title="Snooze to tomorrow"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            update
                          </span>
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-lowest transition-colors"
                          title="More options"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            more_vert
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">
                    task_alt
                  </span>
                  <p className="text-sm text-outline mb-4">
                    Belum ada task harian yang dibuat.
                  </p>
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mx-auto border border-purple-500/30 shadow-none active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Tambah Task Hari Ini
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest">
              <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  forward
                </span>
                <span>Semua task terdistribusi sesuai prioritas hari ini.</span>
              </div>
              <button className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold tracking-wider uppercase transition-colors">
                Pindahkan Task Tertunda ke Esok Hari →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col space-y-6 sm:space-y-8">
          {/* Current Sprint Module */}
          <div id="focus-sprint-section" className="relative rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm overflow-hidden space-y-6 scroll-mt-20 transition-all">
            <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  Active Focus Sprint
                </h2>
              </div>
              <span className="text-xs text-outline font-medium">
                Sprint 3 of 4
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 152 152"
                >
                  <circle
                    cx="76"
                    cy="76"
                    fill="none"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-container"
                  ></circle>
                  <circle
                    cx="76"
                    cy="76"
                    fill="none"
                    r="68"
                    stroke="url(#cyberGradient)"
                    strokeDasharray="427.25"
                    strokeDashoffset={427.25 - (427.25 * (timeLeft / (initialDuration * 60)))}
                    strokeLinecap="round"
                    strokeWidth="8"
                  ></circle>
                  <defs>
                    <linearGradient
                      id="cyberGradient"
                      x1="0%"
                      x2="100%"
                      y1="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#4cd7f6"></stop>
                      <stop offset="100%" stopColor="#a078ff"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <button
                  type="button"
                  onClick={() => {
                    setCustomMinutesInput(initialDuration.toString());
                    setCustomTopicInput(currentTopic);
                    setIsDurationModalOpen(true);
                  }}
                  className="absolute flex flex-col items-center justify-center text-center group/timer cursor-pointer focus:outline-none"
                  title="Klik untuk ubah durasi timer (Preset / Custom)"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-extrabold text-on-surface tracking-tight group-hover/timer:text-secondary transition-colors">
                      {formatTimer()}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-outline opacity-0 group-hover/timer:opacity-100 group-hover/timer:text-secondary transition-all">
                      edit
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-secondary font-bold mt-0.5">
                    {isActive ? (isPaused ? "Paused" : "Running") : "Idle • Klik Edit"}
                  </span>
                </button>
              </div>

              {/* Quick Preset Selector Chips */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomDuration(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      initialDuration === m
                        ? "bg-secondary text-on-secondary font-bold shadow-sm"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-neutral-800/40"
                    }`}
                    title={`Set durasi ${m} menit`}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomMinutesInput(initialDuration.toString());
                    setCustomTopicInput(currentTopic);
                    setIsDurationModalOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    ![15, 25, 45, 60].includes(initialDuration)
                      ? "bg-secondary text-on-secondary font-bold shadow-sm"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-neutral-800/40"
                  }`}
                  title="Atur durasi kustom"
                >
                  <span className="material-symbols-outlined text-[13px]">tune</span>
                  <span>{![15, 25, 45, 60].includes(initialDuration) ? `${initialDuration}m` : "Custom"}</span>
                </button>
              </div>

              <div className="mt-3 text-center">
                <div className="text-base font-semibold text-on-surface">
                  {currentTopic || "Mulai Sesi Baru"}
                </div>
                <div className="text-xs text-on-surface-variant font-normal mt-0.5">
                  {currentTopic ? "Fokus pada topik ini" : "Pilih task untuk memulai sprint"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  shield
                </span>
                <span className="text-xs font-medium">
                  Distraction Blocker
                </span>
              </div>
              <span className="text-xs text-secondary font-bold px-2.5 py-1 rounded bg-surface-container-high">
                0 Blocked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  if (isActive) {
                    if (isPaused) resumeTimer();
                    else pauseTimer();
                  } else {
                    startTimer(25);
                  }
                }}
                className={`py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !isActive || isPaused
                    ? "bg-secondary text-on-secondary hover:brightness-110 shadow-none"
                    : "bg-surface-container-high hover:bg-surface-bright text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {!isActive ? "play_arrow" : isPaused ? "play_arrow" : "pause"}
                </span>
                <span>{!isActive ? "Start" : isPaused ? "Resume" : "Pause"}</span>
              </button>
              <button
                onClick={stopTimer}
                className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs uppercase tracking-wider font-semibold transition-all border border-purple-500/30 shadow-none flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">
                  stop
                </span>
                <span>Selesai</span>
              </button>
            </div>
          </div>

          {/* Urgent Deadlines */}
          <div className="rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-error text-[22px]">
                  crisis_alert
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  Crucial Deadlines
                </h2>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
            </div>

            <div className="space-y-3">
              {deadlines.length > 0 ? (
                deadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="p-4 rounded-xl bg-surface-container flex items-start gap-3.5 transition-all hover:bg-surface-container-high"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${deadline.bgClass}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {deadline.icon}
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold tracking-wider uppercase ${deadline.colorClass}`}
                        >
                          {deadline.time}
                        </span>
                        <span className="text-xs text-outline font-medium">
                          {deadline.timeRemaining}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-on-surface truncate">
                        {deadline.title}
                      </div>
                      <div className="text-xs text-on-surface-variant font-normal">
                        {deadline.description}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-outline text-[36px] mb-1">
                    done_all
                  </span>
                  <p className="text-xs text-outline">
                    Tidak ada deadline krusial terdekat.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Rituals */}
          <div className="rounded-2xl bg-surface-container-low p-5 sm:p-6 border border-neutral-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20">
                  <span className="material-symbols-outlined text-[20px]">vital_signs</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface tracking-tight">Daily Rituals</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono mt-0.5 inline-block ${
                    rituals.filter(r => r.is_completed).length === rituals.length && rituals.length > 0
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {rituals.filter((r) => r.is_completed).length} / {rituals.length} Done
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsRitualModalOpen(true)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-secondary/20 text-on-surface-variant hover:text-secondary flex items-center justify-center transition-colors border border-neutral-800/50"
                title="Tambah Daily Ritual"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {rituals.length > 0 ? (
                rituals.map((ritual) => {
                  const isDone = ritual.is_completed;
                  return (
                    <div
                      key={ritual.id}
                      className={`group flex items-center gap-2.5 p-3 rounded-xl transition-all ${
                        isDone
                          ? 'bg-secondary/8 border border-secondary/15'
                          : 'bg-surface-container border border-transparent hover:border-neutral-800/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleRitual(ritual.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                          isDone
                            ? 'text-secondary'
                            : 'text-outline group-hover:text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isDone ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </button>

                      {/* Inline Edit or Title */}
                      {editingRitualId === ritual.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={editRitualTitle}
                            onChange={e => setEditRitualTitle(e.target.value)}
                            className="flex-1 bg-surface-container-high border border-secondary/30 text-on-surface px-2 py-1 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
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
                            className="w-14 bg-surface-container-high border border-secondary/30 text-on-surface px-2 py-1 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                            min={1}
                          />
                          <span className="text-xs text-outline">m</span>
                          <button
                            onClick={async () => {
                              await updateRitual(ritual.id, editRitualTitle, editRitualTarget);
                              setEditingRitualId(null);
                            }}
                            className="w-7 h-7 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/40"
                          >
                            <span className="material-symbols-outlined text-[15px]">check</span>
                          </button>
                          <button
                            onClick={() => setEditingRitualId(null)}
                            className="w-7 h-7 rounded-lg bg-surface-container text-outline flex items-center justify-center cursor-pointer hover:bg-surface-container-high"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      ) : confirmDeleteRitualId === ritual.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-error font-medium">Hapus ritual ini?</span>
                          <button
                            onClick={() => { deleteRitual(ritual.id); setConfirmDeleteRitualId(null); }}
                            className="px-2.5 py-1 rounded-lg bg-error/20 text-error text-xs font-semibold cursor-pointer hover:bg-error/30"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setConfirmDeleteRitualId(null)}
                            className="px-2.5 py-1 rounded-lg bg-surface-container text-outline text-xs cursor-pointer hover:bg-surface-container-high"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`flex-1 text-sm font-medium truncate ${
                            isDone ? 'text-on-surface-variant line-through' : 'text-on-surface'
                          }`}>
                            {ritual.title}
                          </span>
                          {/* Hover action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingRitualId(ritual.id);
                                setEditRitualTitle(ritual.title);
                                setEditRitualTarget(ritual.target_minutes);
                              }}
                              className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
                              title="Edit Ritual"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteRitualId(ritual.id)}
                              className="w-7 h-7 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center cursor-pointer transition-colors"
                              title="Hapus Ritual"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                          <span className="text-xs text-outline font-mono flex-shrink-0">
                            {ritual.target_minutes ? `${ritual.target_minutes}m` : 'Daily'}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-outline">Tidak ada ritual harian. Klik + untuk menambah.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isRitualModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-5 border border-white/10">
            <h2 className="text-xl font-bold text-on-surface">
              Tambah Daily Ritual
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Nama Ritual
                </label>
                <input
                  value={ritualForm.title}
                  onChange={(e) =>
                    setRitualForm({ ...ritualForm, title: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contoh: Review Flashcard"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Target Menit
                </label>
                <input
                  type="number"
                  value={ritualForm.targetMinutes}
                  onChange={(e) =>
                    setRitualForm({ ...ritualForm, targetMinutes: parseInt(e.target.value) || 30 })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contoh: 15"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsRitualModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
              >
                Batal
              </button>
              <button
                onClick={handleCreateRitual}
                className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30 shadow-none"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-5 border border-white/10">
            <h2 className="text-xl font-bold text-on-surface">
              Tambah Task Hari Ini
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Judul Task
                </label>
                <input
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contoh: Implementasi gRPC API"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Kategori/Tag
                </label>
                <select
                  value={taskForm.category}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, category: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Study">Study</option>
                  <option value="Project">Project</option>
                  <option value="Competitions">Competitions</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Prioritas
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, priority: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="high">HIGH</option>
                  <option value="medium">MED</option>
                  <option value="low">LOW</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Estimasi Waktu (Menit)
                </label>
                <input
                  type="number"
                  value={taskForm.estimatedMinutes}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      estimatedMinutes: e.target.value,
                    })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateTask}
                className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30 transition-colors shadow-none"
              >
                Simpan Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isStudyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl space-y-5 border border-white/10">
            <h2 className="text-xl font-bold text-on-surface">
              Log Study Session
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Subjek/Topik
                </label>
                <input
                  value={studyForm.subject}
                  onChange={(e) =>
                    setStudyForm({ ...studyForm, subject: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="Contoh: React Query Mastery"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  value={studyForm.duration}
                  onChange={(e) =>
                    setStudyForm({
                      ...studyForm,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="45"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-outline mb-1.5">
                  Catatan Singkat (Opsional)
                </label>
                <textarea
                  value={studyForm.notes}
                  onChange={(e) =>
                    setStudyForm({ ...studyForm, notes: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                  placeholder="Tadi sempat stuck di cache invalidation..."
                  rows={3}
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsStudyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogStudy}
                className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30 transition-colors shadow-none"
              >
                Simpan Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duration & Topic Selector Modal */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-low border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  Atur Durasi Focus Sprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDurationModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-on-surface-variant block mb-2">
                  Preset Durasi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 25, 30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCustomMinutesInput(m.toString())}
                      className={`py-2 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
                        parseInt(customMinutesInput, 10) === m
                          ? "bg-purple-600 text-white border-purple-500/50"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface border-neutral-800/50"
                      }`}
                    >
                      {m} Menit
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface-variant block mb-1.5">
                  Durasi Kustom:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container border border-neutral-800 text-on-surface font-mono text-sm focus:outline-none focus:border-secondary transition-colors"
                    placeholder="Contoh: 45"
                  />
                  <span className="text-xs text-on-surface-variant font-mono">Menit (1-240)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-on-surface-variant block mb-1.5">
                  Fokus Topik / Materi (Opsional):
                </label>
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-neutral-800 text-on-surface font-sans text-sm focus:outline-none focus:border-secondary transition-colors"
                  placeholder="Misal: Bab 4 Fisika Kuantum / Slicing UI"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDurationModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(1, Math.min(240, parseInt(customMinutesInput, 10) || 25));
                  setCustomDuration(val, customTopicInput.trim() || undefined);
                  setIsDurationModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors border border-purple-500/30 cursor-pointer"
              >
                Terapkan Durasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Today;
