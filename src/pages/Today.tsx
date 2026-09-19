import { useState, useEffect, useCallback } from "react";
import { taskApi, analyticsApi, studySessionApi, ritualApi, competitionApi } from "../api";
import { useFocusTimer } from "../context/FocusTimerContext";

// Types for Mock Data
interface TimeBlock {
  id: string;
  time: string;
  category: string;
  status: "Completed" | "Active" | "Upcoming";
  duration?: string;
  title: string;
  description?: string;
  xp?: number;
}

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
  // Time blocks, deadlines, and rituals remain as frontend-only UI state
  const [timeBlocks] = useState<TimeBlock[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [rituals, setRituals] = useState<any[]>([]);

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
      }));
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

  // Fetch rituals
  const fetchRituals = useCallback(async () => {
    try {
      const res = await ritualApi.getAll();
      if (res.success) {
        setRituals(res.data);
      }
    } catch (e) {
      console.error(e);
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
    fetchRituals();
    fetchDeadlines();
  }, [fetchTasks, fetchAnalytics, fetchRituals, fetchDeadlines]);

  const toggleTask = async (id: string) => {
    const task = checklistTasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    setChecklistTasks((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: !task.completed } : t)),
    );

    try {
      await taskApi.update(id, { is_completed: !task.completed });
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

  const toggleRitual = async (id: string) => {
    const ritual = rituals.find((r) => r.id === id);
    if (!ritual) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const isCompleted = ritual.last_completed_date?.startsWith(todayStr);

    // Optimistic UI
    setRituals((prev) => prev.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          last_completed_date: isCompleted ? null : new Date().toISOString()
        };
      }
      return r;
    }));

    try {
      await ritualApi.toggle(id);
      fetchAnalytics(); // Refresh XP
    } catch {
      // Revert
      setRituals((prev) => prev.map((r) => {
        if (r.id === id) {
          return { ...r, last_completed_date: ritual.last_completed_date };
        }
        return r;
      }));
    }
  };

  const { 
    isActive, isPaused, timeLeft, initialDuration, currentTopic, 
    startTimer, pauseTimer, resumeTimer, stopTimer, formatTimer,
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
    target: "",
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
      await ritualApi.create(ritualForm);
      setIsRitualModalOpen(false);
      setRitualForm({ title: "", target: "" });
      fetchRituals();
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
    <div className="flex flex-col w-full space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Command Status & Priming Header */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 border border-white/5 shadow-sm">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-primary-container/20 to-secondary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-secondary text-xs font-semibold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/25 text-primary text-xs font-bold tracking-wide">
                <span className="material-symbols-outlined text-[15px]">
                  bolt
                </span>
                COGNITIVE RESONANCE: 94%
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight leading-tight">
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary text-xs font-bold tracking-wider uppercase transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                graphic_eq
              </span>
              <span>432Hz Sprint (45m)</span>
            </button>
            <button
              onClick={() => setIsStudyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-secondary text-xs font-bold tracking-wider uppercase transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                menu_book
              </span>
              <span>Log Study Session</span>
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(160,120,255,0.35)] active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_task
              </span>
              <span>+ Tambah Task Hari Ini</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Daily Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Focus Time */}
        <div className="relative p-6 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between shadow-sm overflow-hidden group min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">
              Focus Time Today
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">
                schedule
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              {focusHours}j {focusMins}m
            </span>
            <span className="text-xs text-secondary font-bold">
              {focusMinutes > 0
                ? `${Math.min(Math.round((focusMinutes / 480) * 100), 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-secondary h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(76,215,246,0.6)]"
              style={{ width: `${Math.min((focusMinutes / 480) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="mt-2 text-xs text-on-surface-variant font-normal">
            {focusMinutes > 0
              ? `${focusMinutes} menit fokus hari ini`
              : "Target 8 jam fokus harian"}
          </span>
        </div>

        {/* Stat 2: Daily Tasks */}
        <div className="relative p-6 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between shadow-sm overflow-hidden group min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">
              Daily Tasks
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">
                task_alt
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              {todayTasksCompleted}/{todayTasksTotal}
            </span>
            <span className="text-xs text-primary font-bold">
              {taskPercent}% Selesai
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(160,120,255,0.6)]"
              style={{ width: `${taskPercent}%` }}
            ></div>
          </div>
          <span className="mt-2 text-xs text-on-surface-variant font-normal">
            {todayTasksTotal > 0
              ? `${todayTasksCompleted} dari ${todayTasksTotal} selesai`
              : "Target harian terdistribusi"}
          </span>
        </div>

        {/* Stat 3: Deep Work Blocks */}
        <div className="relative p-6 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between shadow-sm overflow-hidden group min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">
              Deep Work Blocks
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">
                psychology
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              {analytics?.today?.sessionsCount || 0} Sesi
            </span>
            <span className="text-xs text-tertiary font-bold">
              Active
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container"></span>
          </div>
          <span className="mt-2 text-xs text-on-surface-variant font-normal">
            {analytics?.today?.sessionsCount > 0
              ? `${analytics.today.sessionsCount} sesi sprint tercatat`
              : "Siklus deep work terencana"}
          </span>
        </div>

        {/* Stat 4: Growth Velocity */}
        <div className="relative p-6 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col justify-between shadow-sm overflow-hidden group min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">
              Growth Velocity
            </span>
            <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">
                stars
              </span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              +{xp} XP
            </span>
            <span className="text-xs text-primary font-bold">
              Streak: {streak}D
            </span>
          </div>
          <div className="mt-3 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-secondary to-primary h-1.5 rounded-full"
              style={{ width: `${Math.min(xp / 10, 100)}%` }}
            ></div>
          </div>
          <span className="mt-2 text-xs text-on-surface-variant font-normal">
            {xp > 0 ? `${xp} XP terkumpul hari ini` : "Akumulasi XP dan streak harian"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col space-y-6 sm:space-y-8">
          {/* Time-Block Schedule */}
          <div className="rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  view_timeline
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  Daily Time-Block Schedule
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant uppercase font-medium">
                Local UTC+7
              </span>
            </div>

            <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
              {timeBlocks.length > 0 ? (
                timeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`relative pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      block.status === "Active"
                        ? "p-5 rounded-xl bg-surface-container shadow-[0_0_16px_rgba(76,215,246,0.1)] gap-4"
                        : block.status === "Completed"
                          ? "p-4 sm:p-5 rounded-xl bg-surface-container/60 hover:bg-surface-container transition-colors"
                          : "p-4 sm:p-5 rounded-xl bg-surface-container/40 hover:bg-surface-container/70 transition-colors"
                    }`}
                  >
                    {block.status === "Active" ? (
                      <>
                        <span className="absolute left-1.5 top-6 w-3.5 h-3.5 rounded-full bg-secondary shadow-[0_0_10px_rgba(76,215,246,0.9)] animate-ping"></span>
                        <span className="absolute left-2 top-6.5 w-2.5 h-2.5 rounded-full bg-secondary"></span>
                      </>
                    ) : (
                      <span
                        className={`absolute left-2 top-4 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-low ${
                          block.status === "Completed" ? "bg-outline" : "bg-surface-container-highest"
                        }`}
                      ></span>
                    )}

                    <div className={block.status === "Active" ? "space-y-1.5" : "space-y-1"}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${
                            block.status === "Active"
                              ? "text-secondary font-bold"
                              : block.status === "Completed"
                                ? "text-on-surface-variant line-through"
                                : "text-outline"
                          }`}
                        >
                          {block.time}
                        </span>
                        {block.status === "Active" && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-xs font-bold uppercase tracking-wider">
                            ● ACTIVE NOW
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            block.status === "Active"
                              ? "bg-surface-container-high text-primary font-semibold"
                              : block.status === "Completed"
                                ? "bg-surface-container-high text-outline"
                                : "bg-surface-container text-outline"
                          }`}
                        >
                          {block.category}
                        </span>
                        {block.status === "Completed" && block.duration && (
                          <span className="flex items-center gap-1 text-secondary text-xs font-medium">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>{" "}
                            Selesai ({block.duration})
                          </span>
                        )}
                        {block.status === "Upcoming" && (
                          <span className="text-xs text-outline font-normal">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div
                        className={
                          block.status === "Active"
                            ? "text-base font-semibold text-on-surface"
                            : block.status === "Completed"
                              ? "text-sm font-medium text-on-surface-variant line-through"
                              : "text-sm font-medium text-on-surface"
                        }
                      >
                        {block.title}
                      </div>
                      {block.description && (
                        <p className="text-xs text-on-surface-variant font-normal">
                          {block.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`flex-shrink-0 self-start sm:self-auto ${
                        block.status === "Active"
                          ? "flex items-center gap-2 sm:self-center"
                          : "text-xs text-outline px-2.5 py-1 rounded bg-surface-container"
                      }`}
                    >
                      {block.status === "Active" ? (
                        <button className="px-4 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold uppercase tracking-wider hover:bg-secondary-fixed transition-colors shadow-[0_0_12px_rgba(76,215,246,0.3)]">
                          In Session
                        </button>
                      ) : block.xp ? (
                        `+${block.xp} XP`
                      ) : block.duration ? (
                        block.duration
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center pl-8">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">
                    event_busy
                  </span>
                  <p className="text-sm text-outline">
                    Belum ada blok waktu yang dijadwalkan.
                  </p>
                </div>
              )}
            </div>
          </div>

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
              <span className="text-xs text-on-surface-variant font-medium px-3 py-1 rounded-full bg-surface-container self-start sm:self-auto">
                {checklistTasks.filter((t) => t.completed).length} dari {checklistTasks.length} selesai
              </span>
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
                checklistTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 sm:p-5 rounded-xl transition-all flex items-start justify-between gap-4 group ${
                      task.completed
                        ? "bg-surface-container/50 hover:bg-surface-container"
                        : "bg-surface-container hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                          task.completed
                            ? "bg-primary border-primary text-on-primary"
                            : "border-outline/40 hover:border-primary text-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] font-bold">
                          check
                        </span>
                      </button>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                ))
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
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:brightness-110 flex items-center gap-2 mx-auto shadow-[0_0_15px_rgba(160,120,255,0.4)]"
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
          <div className="relative rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></span>
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
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-on-surface tracking-tight">
                    {formatTimer()}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-secondary font-bold mt-0.5">
                    {isActive ? (isPaused ? "Paused" : "Running") : "Idle"}
                  </span>
                </div>
              </div>
              <div className="mt-4 text-center">
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
                    ? "bg-secondary text-on-secondary hover:brightness-110 shadow-[0_0_12px_rgba(76,215,246,0.3)]"
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
                className="py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs uppercase tracking-wider font-bold transition-all shadow-[0_0_16px_rgba(160,120,255,0.3)] flex items-center justify-center gap-1.5 active:scale-95"
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
          <div className="rounded-2xl bg-surface-container-low p-6 sm:p-7 border border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  vital_signs
                </span>
                <h2 className="text-xl font-bold text-on-surface tracking-tight">
                  Daily Rituals
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary font-bold">
                  {rituals.filter((r) => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    return r.last_completed_date?.startsWith(todayStr);
                  }).length} / {rituals.length} Done
                </span>
                <button
                  onClick={() => setIsRitualModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high hover:text-primary transition-colors"
                  title="Tambah Daily Ritual"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              {rituals.length > 0 ? (
                rituals.map((ritual) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isDone = ritual.last_completed_date?.startsWith(todayStr);

                  return (
                    <div
                      key={ritual.id}
                      onClick={() => toggleRitual(ritual.id)}
                      className={`flex items-center justify-between p-3.5 px-4 rounded-xl transition-colors cursor-pointer group ${
                        isDone ? "bg-surface-container/60" : "bg-surface-container hover:bg-surface-container-high"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            isDone ? "text-secondary" : "text-outline group-hover:text-secondary"
                          }`}
                        >
                          {isDone ? "check_box" : "check_box_outline_blank"}
                        </span>
                        <span
                          className={
                            isDone
                              ? "text-on-surface-variant line-through font-normal"
                              : "text-on-surface font-medium"
                          }
                        >
                          {ritual.title}
                        </span>
                      </div>
                      <span className="text-xs text-outline font-normal">
                        {ritual.target || "Daily"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-outline">
                    Tidak ada ritual harian hari ini.
                  </p>
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
                  Target (Opsional)
                </label>
                <input
                  value={ritualForm.target}
                  onChange={(e) =>
                    setRitualForm({ ...ritualForm, target: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contoh: 15 Menit"
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
                className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-primary text-on-primary hover:brightness-110 shadow-[0_0_12px_rgba(160,120,255,0.3)]"
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
                className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-bold bg-primary text-on-primary hover:brightness-110 transition-colors shadow-[0_0_12px_rgba(160,120,255,0.3)]"
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
                className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-bold bg-secondary text-on-secondary hover:brightness-110 transition-colors shadow-[0_0_12px_rgba(76,215,246,0.3)]"
              >
                Simpan Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Today;
