import { useState, useEffect, useCallback } from "react";
import { taskApi, analyticsApi, studySessionApi } from "../api";
import { useGlobalState } from "../context/GlobalContext";

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

interface Ritual {
  id: string;
  title: string;
  time: string;
  status: "Done" | "In Progress" | "Pending";
}

const Today = () => {
  const { user } = useGlobalState();
  // Time blocks, deadlines, and rituals remain as frontend-only UI state
  const [timeBlocks] = useState<TimeBlock[]>([]);
  const [deadlines] = useState<Deadline[]>([]);
  const [rituals, setRituals] = useState<Ritual[]>([]);

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
        duration: "~25m",
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

  useEffect(() => {
    fetchTasks();
    fetchAnalytics();
  }, [fetchTasks, fetchAnalytics]);

  const toggleTask = async (id: string) => {
    const task = checklistTasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    setChecklistTasks((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
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

  const toggleRitual = (id: string) => {
    setRituals((rits) =>
      rits.map((r) => {
        if (r.id === id) {
          const nextStatus = r.status === "Done" ? "Pending" : "Done";
          return { ...r, status: nextStatus };
        }
        return r;
      }),
    );
  };

  const [isSprintRunning, setIsSprintRunning] = useState(false);
  const [sprintSeconds, setSprintSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isSprintRunning && sprintSeconds > 0) {
      interval = setInterval(() => {
        setSprintSeconds((s) => s - 1);
      }, 1000);
    } else if (sprintSeconds === 0 && isSprintRunning) {
      setIsSprintRunning(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSprintRunning, sprintSeconds]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await taskApi.create({
        title: taskForm.title,
        category: taskForm.category,
        priority: taskForm.priority,
        description: `Estimasi Waktu: ${taskForm.estimatedMinutes} menit`,
        scheduled_date: today,
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
    } catch (err) {
      console.error(err);
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
    <div className="flex flex-col w-full space-y-space-lg max-w-7xl mx-auto pb-space-xl">
      {/* Top Command Status & Priming Header */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-lg">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-primary-container/20 to-secondary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg">
          <div className="space-y-space-xs max-w-2xl">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-primary-container/25 text-primary font-label-sm text-label-sm font-semibold tracking-wide">
                <span className="material-symbols-outlined text-[14px]">
                  bolt
                </span>
                COGNITIVE RESONANCE: 94%
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Today's Command: High Resonance & Deep Work
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">
                format_quote
              </span>
              <span className="italic text-on-surface">
                "Fokus pada proses, bukan kebisingan. 1 target besar bernilai 10
                target kecil."
              </span>
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap self-start xl:self-center">
            <button
              onClick={() => {
                setSprintSeconds(45 * 60);
                setIsSprintRunning(true);
              }}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-md text-label-md tracking-wider uppercase transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                graphic_eq
              </span>
              <span>432Hz Sprint (45m)</span>
            </button>
            <button
              onClick={() => setIsStudyModalOpen(true)}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-secondary font-label-md text-label-md tracking-wider uppercase transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-secondary text-[18px]">
                menu_book
              </span>
              <span>Log Study Session</span>
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-xl bg-primary-container hover:bg-inverse-primary text-on-primary font-label-md text-label-md font-semibold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(160,120,255,0.35)] active:scale-95"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Stat 1: Focus Time */}
        <div className="relative p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Focus Time Today
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">
                schedule
              </span>
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline justify-between">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight">
              {focusHours}j {focusMins}m
            </span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold">
              {focusMinutes > 0
                ? `${Math.min(Math.round((focusMinutes / 480) * 100), 100)}%`
                : "0%"}
            </span>
          </div>
          <div className="mt-space-xs w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-secondary h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(76,215,246,0.6)]"
              style={{ width: `${Math.min((focusMinutes / 480) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
            {focusMinutes > 0
              ? `${focusMinutes} menit fokus hari ini`
              : "Belum ada fokus hari ini"}
          </span>
        </div>

        {/* Stat 2: Daily Tasks */}
        <div className="relative p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Daily Tasks
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">
                task_alt
              </span>
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline justify-between">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight">
              {todayTasksCompleted}/{todayTasksTotal}
            </span>
            <span className="font-label-sm text-label-sm text-primary font-semibold">
              {taskPercent}% Selesai
            </span>
          </div>
          <div className="mt-space-xs w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary-container h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(160,120,255,0.6)]"
              style={{ width: `${taskPercent}%` }}
            ></div>
          </div>
          <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
            {todayTasksTotal > 0
              ? `${todayTasksCompleted} dari ${todayTasksTotal} selesai`
              : "Belum ada task"}
          </span>
        </div>

        {/* Stat 3: Deep Work Blocks */}
        <div className="relative p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Deep Work Blocks
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px]">
                psychology
              </span>
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline justify-between">
            <span className="font-metric-display text-metric-display text-on-surface tracking-tight">
              {analytics?.today?.sessionsCount || 0} Sesi
            </span>
            <span className="font-label-sm text-label-sm text-tertiary font-semibold">
              -
            </span>
          </div>
          <div className="mt-space-xs flex gap-1.5">
            <span className="flex-1 h-1.5 rounded-full bg-surface-container-highest"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container-highest"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container-highest"></span>
            <span className="flex-1 h-1.5 rounded-full bg-surface-container-highest"></span>
          </div>
          <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
            {analytics?.today?.sessionsCount > 0
              ? `${analytics.today.sessionsCount} sprint hari ini`
              : "Belum ada sprint aktif"}
          </span>
        </div>

        {/* Stat 4: Growth Velocity */}
        <div className="relative p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Growth Velocity
            </span>
            <span className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[16px]">
                stars
              </span>
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline justify-between">
            <span className="font-metric-display text-metric-display text-primary tracking-tight">
              +{xp} XP
            </span>
            <span className="font-label-sm text-label-sm text-primary font-semibold">
              Streak: {streak}D
            </span>
          </div>
          <div className="mt-space-xs w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-secondary to-primary h-1.5 rounded-full"
              style={{ width: `${Math.min(xp / 10, 100)}%` }}
            ></div>
          </div>
          <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
            {xp > 0 ? `Total ${xp} XP terkumpul` : "Kumpulkan XP hari ini"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col space-y-space-lg">
          {/* Time-Block Schedule */}
          <div className="rounded-xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  view_timeline
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Daily Time-Block Schedule
                </h2>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase">
                Local UTC+7
              </span>
            </div>

            <div className="relative space-y-space-md before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
              {timeBlocks.length > 0 ? (
                timeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`relative pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs ${block.status === "Active" ? "p-space-md rounded-xl bg-surface-container shadow-[0_0_16px_rgba(76,215,246,0.1)] gap-space-md" : block.status === "Completed" ? "p-space-sm rounded-lg bg-surface-container/40 hover:bg-surface-container transition-colors" : "p-space-sm rounded-lg bg-surface-container/20 hover:bg-surface-container/40 transition-colors"}`}
                  >
                    {block.status === "Active" ? (
                      <>
                        <span className="absolute left-1.5 top-5 w-3.5 h-3.5 rounded-full bg-secondary shadow-[0_0_10px_rgba(76,215,246,0.9)] animate-ping"></span>
                        <span className="absolute left-2 top-5.5 w-2.5 h-2.5 rounded-full bg-secondary"></span>
                      </>
                    ) : (
                      <span
                        className={`absolute left-2 top-3 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-low ${block.status === "Completed" ? "bg-outline" : "bg-surface-container-highest"}`}
                      ></span>
                    )}

                    <div
                      className={
                        block.status === "Active" ? "space-y-1" : "space-y-0.5"
                      }
                    >
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span
                          className={`font-label-md text-label-md ${block.status === "Active" ? "text-secondary font-bold" : block.status === "Completed" ? "text-on-surface-variant line-through" : "text-outline"}`}
                        >
                          {block.time}
                        </span>
                        {block.status === "Active" && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                            ● ACTIVE NOW
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded font-label-sm text-label-sm ${block.status === "Active" ? "bg-surface-container-high text-primary px-2 py-0.5" : block.status === "Completed" ? "bg-surface-container-high text-outline" : "bg-surface-container text-outline"}`}
                        >
                          {block.category}
                        </span>
                        {block.status === "Completed" && block.duration && (
                          <span className="flex items-center text-secondary font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>{" "}
                            Selesai ({block.duration})
                          </span>
                        )}
                        {block.status === "Upcoming" && (
                          <span className="font-label-sm text-label-sm text-outline">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div
                        className={
                          block.status === "Active"
                            ? "font-body-lg text-body-lg font-semibold text-on-surface"
                            : block.status === "Completed"
                              ? "font-body-md text-body-md font-medium text-on-surface-variant line-through"
                              : "font-body-md text-body-md font-medium text-on-surface"
                        }
                      >
                        {block.title}
                      </div>
                      {block.description && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {block.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`flex-shrink-0 self-start sm:self-auto ${block.status === "Active" ? "flex items-center gap-space-xs sm:self-center" : "font-label-sm text-label-sm text-outline px-2 py-1 rounded bg-surface-container-low"}`}
                    >
                      {block.status === "Active" ? (
                        <button className="px-space-md py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider hover:bg-secondary-fixed transition-colors shadow-[0_0_12px_rgba(76,215,246,0.3)]">
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
                <div className="py-space-xl text-center pl-8">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">
                    event_busy
                  </span>
                  <p className="font-body-md text-outline">
                    Belum ada blok waktu yang dijadwalkan.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actionable Tasks Checklist */}
          <div className="rounded-xl bg-surface-container-low p-space-lg shadow-sm space-y-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  checklist
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Core Execution Checklist
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Auto-synced with {user?.name || 'Operator'}'s Backlog
              </span>
            </div>

            <div className="space-y-space-xs">
              {loading ? (
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2 animate-spin">
                    progress_activity
                  </span>
                  <p className="font-body-md text-outline">Memuat tasks...</p>
                </div>
              ) : error ? (
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-error text-[48px] mb-2">
                    error
                  </span>
                  <p className="font-body-md text-error">{error}</p>
                  <button
                    onClick={fetchTasks}
                    className="mt-2 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : checklistTasks.length > 0 ? (
                checklistTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-space-md rounded-xl transition-all flex items-start justify-between gap-space-md group ${task.completed ? "bg-surface-container/50 hover:bg-surface-container" : "bg-surface-container hover:bg-surface-container-high"}`}
                  >
                    <div className="flex items-start gap-space-sm">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${task.completed ? "bg-primary-container text-on-primary-container" : "bg-surface-container-lowest text-transparent hover:text-primary-fixed"}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                      </button>
                      <div className="space-y-1">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase tracking-wider ${task.completed ? "bg-surface-container-highest text-outline" : task.priority === "HIGH" ? "bg-error-container text-on-error-container" : "bg-surface-container-highest text-outline"}`}
                          >
                            {task.priority}
                          </span>
                          <span className="font-label-sm text-label-sm text-outline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]">
                              timer
                            </span>{" "}
                            {task.duration}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-label-sm text-label-sm ${task.completed ? "bg-surface-container-high text-outline" : "bg-surface-container-highest text-secondary"}`}
                          >
                            {task.category}
                          </span>
                        </div>
                        <div
                          className={`font-body-md text-body-md ${task.completed ? "text-on-surface-variant line-through" : "text-on-surface font-medium"}`}
                        >
                          {task.title}
                        </div>
                        {!task.completed && task.description && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {task.completed ? (
                      <span className="font-label-sm text-label-sm text-secondary px-2 py-1 rounded bg-surface-container-low">
                        +{task.xp} XP
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
                <div className="py-space-xl text-center">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">
                    task_alt
                  </span>
                  <p className="font-body-md text-outline mb-4">
                    Belum ada task harian yang dibuat.
                  </p>
                  <button onClick={() => setIsTaskModalOpen(true)} className="px-space-md py-2 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:brightness-110 flex items-center gap-2 mx-auto shadow-[0_0_15px_rgba(160,120,255,0.4)]">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Tambah Task Hari Ini
                  </button>
                </div>
              )}
            </div>

            <div className="pt-space-xs flex flex-col sm:flex-row items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  forward
                </span>
                <span>Semua task terdistribusi sesuai prioritas hari ini.</span>
              </div>
              <button className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm tracking-wider uppercase transition-colors">
                Pindahkan Task Tertunda ke Esok Hari →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col space-y-space-lg">
          {/* Current Sprint Module */}
          <div className="relative rounded-xl bg-surface-container-low p-space-lg shadow-lg overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]"></span>
                Active Focus Sprint
              </span>
              <span className="font-label-sm text-label-sm text-outline">
                Sprint 3 of 4
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-space-sm">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle
                    className="text-surface-container-highest"
                    cx="80"
                    cy="80"
                    fill="none"
                    r="68"
                    stroke="currentColor"
                    strokeWidth="8"
                  ></circle>
                  <circle
                    className="transition-all duration-1000"
                    cx="80"
                    cy="80"
                    fill="none"
                    r="68"
                    stroke="url(#cyberGradient)"
                    strokeDasharray="427.25"
                    strokeDashoffset="142"
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
                  <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
                    {formatTime(sprintSeconds)}
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-semibold">
                    {sprintSeconds > 0 && isSprintRunning ? "Running" : "Idle"}
                  </span>
                </div>
              </div>
              <div className="mt-space-md text-center">
                <div className="font-body-md text-body-md font-semibold text-on-surface">
                  Mulai Sesi Baru
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Pilih task untuk memulai sprint
                </div>
              </div>
            </div>

            <div className="mt-space-sm p-space-sm rounded-xl bg-surface-container flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  shield
                </span>
                <span className="font-body-sm text-body-sm">
                  Distraction Blocker
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary font-semibold px-2 py-0.5 rounded bg-surface-container-highest">
                0 Blocked
              </span>
            </div>

            <div className="mt-space-md grid grid-cols-2 gap-space-xs">
              <button
                onClick={() => setIsSprintRunning(!isSprintRunning)}
                className={`py-2.5 rounded-xl font-label-md text-label-md uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 ${!isSprintRunning ? "bg-secondary text-on-secondary" : "bg-surface-container-high hover:bg-surface-bright text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSprintRunning ? "pause" : "play_arrow"}
                </span>
                <span>{isSprintRunning ? "Pause" : "Resume"}</span>
              </button>
              <button
                onClick={() => {
                  setIsSprintRunning(false);
                  setSprintSeconds(0);
                }}
                className="py-2.5 rounded-xl bg-primary-container hover:bg-inverse-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-bold transition-all shadow-[0_0_16px_rgba(160,120,255,0.3)] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">
                  check
                </span>
                <span>Complete</span>
              </button>
            </div>
          </div>

          {/* Urgent Deadlines */}
          <div className="rounded-xl bg-surface-container-low p-space-lg shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-error text-[20px]">
                  crisis_alert
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Crucial Deadlines
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            </div>

            <div className="space-y-space-xs">
              {deadlines.length > 0 ? (
                deadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="p-space-sm rounded-xl bg-surface-container flex items-start gap-space-sm"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${deadline.bgClass}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {deadline.icon}
                      </span>
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-label-sm text-label-sm font-bold tracking-wider uppercase ${deadline.colorClass}`}
                        >
                          {deadline.time}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline">
                          {deadline.timeRemaining}
                        </span>
                      </div>
                      <div className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                        {deadline.title}
                      </div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant">
                        {deadline.description}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-space-md text-center">
                  <span className="material-symbols-outlined text-outline text-[32px] mb-1">
                    done_all
                  </span>
                  <p className="font-body-sm text-outline">
                    Tidak ada deadline krusial terdekat.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Rituals */}
          <div className="rounded-xl bg-surface-container-low p-space-lg shadow-sm space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  vital_signs
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Daily Rituals
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-semibold">
                {rituals.filter((r) => r.status === "Done").length} /{" "}
                {rituals.length} Done
              </span>
            </div>

            <div className="space-y-space-xs font-body-sm text-body-sm">
              {rituals.length > 0 ? (
                rituals.map((ritual) => (
                  <div
                    key={ritual.id}
                    onClick={() => toggleRitual(ritual.id)}
                    className={`flex items-center justify-between p-space-xs px-space-sm rounded-lg transition-colors cursor-pointer group ${ritual.status === "Done" ? "bg-surface-container/60" : "bg-surface-container hover:bg-surface-container-high"}`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span
                        className={`material-symbols-outlined text-[18px] ${ritual.status === "Done" ? "text-secondary" : "text-outline group-hover:text-secondary"}`}
                      >
                        {ritual.status === "Done"
                          ? "check_box"
                          : "check_box_outline_blank"}
                      </span>
                      <span
                        className={
                          ritual.status === "Done"
                            ? "text-on-surface-variant line-through"
                            : "text-on-surface font-medium"
                        }
                      >
                        {ritual.title}
                      </span>
                    </div>
                    {ritual.status === "In Progress" ? (
                      <span className="font-label-sm text-label-sm text-secondary font-semibold">
                        In Progress
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-outline">
                        {ritual.time}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-space-md text-center">
                  <p className="font-body-sm text-outline">
                    Tidak ada ritual harian hari ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-md w-full shadow-2xl space-y-space-md border border-surface-container-highest">
            <h2 className="font-headline-md text-on-surface font-bold">
              Tambah Task Hari Ini
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block font-label-sm text-outline mb-1">
                  Judul Task
                </label>
                <input
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Contoh: Implementasi gRPC API"
                />
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">
                  Kategori/Tag
                </label>
                <select
                  value={taskForm.category}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, category: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Study">Study</option>
                  <option value="Project">Project</option>
                  <option value="Competitions">Competitions</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">
                  Prioritas
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, priority: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="high">HIGH</option>
                  <option value="medium">MED</option>
                  <option value="low">LOW</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">
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
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 rounded-lg font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm"
              >
                Simpan Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isStudyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-md w-full shadow-2xl space-y-space-md border border-surface-container-highest">
            <h2 className="font-headline-md text-on-surface font-bold">
              Log Study Session
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block font-label-sm text-outline mb-1">
                  Subjek/Topik
                </label>
                <input
                  value={studyForm.subject}
                  onChange={(e) =>
                    setStudyForm({ ...studyForm, subject: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="Contoh: React Query Mastery"
                />
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">
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
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="45"
                />
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">
                  Catatan Singkat (Opsional)
                </label>
                <textarea
                  value={studyForm.notes}
                  onChange={(e) =>
                    setStudyForm({ ...studyForm, notes: e.target.value })
                  }
                  className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                  placeholder="Tadi sempat stuck di cache invalidation..."
                  rows={3}
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsStudyModalOpen(false)}
                className="px-4 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogStudy}
                className="px-4 py-2 rounded-lg font-label-md bg-secondary text-on-secondary font-bold hover:bg-secondary-fixed transition-colors shadow-[0_0_12px_rgba(76,215,246,0.3)]"
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
