import { useState, useEffect, useRef } from 'react';
import { learningApi, studySessionApi, analyticsApi } from '../api';
import { useNavigate } from 'react-router-dom';
import MaterialDetailModal from '../components/modals/MaterialDetailModal';
import { useFocusTimer } from '../context/FocusTimerContext';

// Define mock data types
export interface LearningPath {
  id: string;
  category: string;
  categoryColorClass: string;
  title: string;
  progressPercent: number;
  progressText: string;
  milestones: {
    id: string;
    title: string;
    status: 'DONE' | 'ACTIVE' | 'TODO';
    statusText?: string;
  }[];
  nextMaterial: string;
  progressColorClass: string;
  bgGradientClass: string;
}

interface Resource {
  id: string;
  category: string;
  type: string;
  difficulty: string;
  publisher: string;
  title: string;
  description: string;
  status: 'LEARNING' | 'NOT_STARTED' | 'COMPLETED';
  progressPercent: number;
  colorClass: string;
  icon: string;
}

interface StudyLog {
  id: string;
  dateStr: string;
  timeStr: string;
  xp: number;
  title: string;
  duration: string;
  category: string;
  takeaway: string;
}

const mapLearningMaterialToResource = (lm: any): Resource => {
  let status: Resource['status'] = 'NOT_STARTED';
  if (lm.status === 'in_progress') status = 'LEARNING';
  else if (lm.status === 'completed') status = 'COMPLETED';

  let colorClass = 'text-primary';
  let icon = 'article';
  
  if (lm.type === 'Cloud' || lm.type === 'Systems') { colorClass = 'text-secondary'; icon = 'cloud'; }
  else if (lm.type === 'AI') { colorClass = 'text-tertiary'; icon = 'psychology'; }
  else if (lm.type === 'Programming') { colorClass = 'text-primary'; icon = 'code'; }
  else if (lm.type === 'Security') { colorClass = 'text-error'; icon = 'security'; }

  let description = lm.url || 'No description';
  try {
    const parsed = JSON.parse(lm.url);
    if (parsed && parsed.isRoadmap) {
      description = parsed.description || description;
    }
  } catch (e) {
    // Normal string
  }

  return {
    id: lm.id,
    category: 'General',
    type: lm.type || 'Article',
    difficulty: 'Intermediate',
    publisher: 'Library',
    title: lm.title,
    description: description,
    status,
    progressPercent: status === 'COMPLETED' ? 100 : (status === 'LEARNING' ? 50 : 0),
    colorClass,
    icon
  };
};

const mapLearningMaterialToPath = (lm: any, index: number): LearningPath | null => {
  try {
    const parsed = JSON.parse(lm.url);
    if (!parsed || !parsed.isRoadmap) return null;
    
    const colorClasses = [
      { cat: 'text-secondary', prog: 'text-secondary', bg: 'from-secondary to-primary' },
      { cat: 'text-primary', prog: 'text-primary', bg: 'from-primary to-secondary' },
      { cat: 'text-tertiary', prog: 'text-tertiary', bg: 'from-tertiary to-primary' },
    ];
    const c = colorClasses[index % colorClasses.length];
    
    let progressPercent = 0;
    let milestones = [];
    if (parsed.milestones && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
      milestones = parsed.milestones;
      const completedCount = milestones.filter((m: any) => m.status === 'DONE').length;
      progressPercent = Math.round((completedCount / milestones.length) * 100);
    } else {
      if (lm.status === 'completed') progressPercent = 100;
      else if (lm.status === 'in_progress') progressPercent = 50;
      
      milestones = [
        { id: '1', title: parsed.description || 'Pahami Dasar', status: progressPercent === 100 ? 'DONE' : 'ACTIVE', statusText: parsed.deadline || 'Tanpa Target' }
      ];
    }

    return {
      id: lm.id,
      category: lm.type || 'General',
      categoryColorClass: `bg-surface-container-high ${c.cat}`,
      title: lm.title,
      progressPercent,
      progressText: progressPercent === 100 ? 'Selesai' : (progressPercent > 0 ? 'Sedang Berjalan' : 'Belum Dimulai'),
      milestones,
      nextMaterial: progressPercent === 100 ? 'Selesai' : 'Lanjutkan Modul',
      progressColorClass: c.prog,
      bgGradientClass: c.bg
    };
  } catch (e) {
    return null;
  }
}

const mapStudySessionToStudyLog = (ss: any): StudyLog => {
  const d = new Date(ss.start_time);
  const titleParts = ss.title ? ss.title.split(' - ') : ['Untitled Session'];
  const title = titleParts[0];
  const takeaway = titleParts.length > 1 ? titleParts.slice(1).join(' - ') : 'Session Completed';
  
  return {
    id: ss.id,
    dateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    timeStr: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    xp: ss.duration_minutes || 0,
    title: title,
    duration: `${ss.duration_minutes}m`,
    category: ss.session_type || 'Sprint',
    takeaway: takeaway
  };
};

const StudySpace = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  // Mock Data
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const { pendingSession, clearPendingSession } = useFocusTimer();

  // Form state
  const [logTitle, setLogTitle] = useState('');
  const [logCategory, setLogCategory] = useState('Systems');
  const [logDuration, setLogDuration] = useState('60');
  const [logTakeaway, setLogTakeaway] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill from pending timer session
  useEffect(() => {
    if (pendingSession) {
      setLogTitle(pendingSession.topic || 'Sesi Fokus');
      setLogDuration(pendingSession.duration.toString());
      scrollToLogger();
    }
  }, [pendingSession]);

  // Filter state
  const [resourceFilter, setResourceFilter] = useState('Semua');

  // Modal State
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    domain: 'Tech & Engineering',
    customDomain: '',
    deadline: '',
    description: ''
  });

  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resLearning, resSession, resAnalytics] = await Promise.all([
        learningApi.getAll(),
        studySessionApi.getAll(),
        analyticsApi.getSummary().catch(() => ({ data: null }))
      ]);
      
      const allResources = resLearning.data.map(mapLearningMaterialToResource);
      
      let pathCount = 0;
      const mappedPaths: LearningPath[] = [];
      resLearning.data.forEach((lm: any) => {
        const path = mapLearningMaterialToPath(lm, pathCount);
        if (path) {
          mappedPaths.push(path);
          pathCount++;
        }
      });

      setResources(allResources);
      setLearningPaths(mappedPaths);
      
      const sortedLogs = resSession.data
        .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 3)
        .map(mapStudySessionToStudyLog);

      setStudyLogs(sortedLogs);
      if (resAnalytics.data) {
        setAnalytics(resAnalytics.data);
      }
    } catch (error) {
      console.error('Error fetching study data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle || !logDuration) return;
    
    setIsSubmitting(true);
    try {
      const startTime = new Date();
      const durationMins = parseInt(logDuration.replace(/[^0-9]/g, '')) || 60;
      
      // If it's from a pending timer, the actual start time was earlier
      if (pendingSession) {
        startTime.setTime(startTime.getTime() - durationMins * 60000);
      }
      
      const endTime = new Date(startTime.getTime() + durationMins * 60000);
      
      // We pass takeaway explicitly so backend creates a KnowledgeDoc
      await studySessionApi.create({
        title: logTitle,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMins,
        session_type: logCategory,
        takeaway: logTakeaway
      });
      
      setLogTitle('');
      setLogDuration('60');
      setLogTakeaway('');
      if (pendingSession) {
        clearPendingSession();
      }
      alert('Sesi belajar berhasil dicatat & disinkronisasi ke Knowledge Base!');
      fetchData();
    } catch (error) {
      console.error('Error submitting log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToLogger = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateRoadmap = async () => {
    if (!roadmapForm.title) return;
    try {
      const payload = {
        isRoadmap: true,
        description: roadmapForm.description,
        deadline: roadmapForm.deadline
      };
      await learningApi.create({
        title: roadmapForm.title,
        type: roadmapForm.domain === 'Custom' ? roadmapForm.customDomain : roadmapForm.domain,
        url: JSON.stringify(payload),
        status: 'not_started'
      });
      setIsRoadmapModalOpen(false);
      setRoadmapForm({ title: '', domain: 'Tech & Engineering', customDomain: '', deadline: '', description: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredResources = resources.filter(res => {
    if (resourceFilter === 'Semua') return true;
    if (resourceFilter === res.type) return true;
    return false;
  });

  const xp = analytics?.user?.xp || 0;
  const streak = analytics?.user?.streak || 0;
  const weeklyFocusHours = Math.floor((analytics?.today?.focusTimeMinutes || 0) / 60);
  const weeklyFocusMins = (analytics?.today?.focusTimeMinutes || 0) % 60;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="font-sans text-sm text-on-surface-variant animate-pulse">Memuat workspace...</p>
          </div>
        </div>
      )}
      {/* Top Telemetry & Header Section */}
      <section className="relative rounded-2xl bg-surface-container-low p-6 sm:p-8 border border-neutral-800/50 shadow-none">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-wider text-secondary font-semibold">
                STUDY SPACE & KNOWLEDGE FORGE
              </span>
              <span className="text-outline/40">•</span>
              <span className="font-mono text-xs text-outline tracking-wider">NODE // CS-SYS-ACCELERATOR</span>
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Study Space & Knowledge Forge
            </h1>
            <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Ruang akselerasi kompetensi teknis, kurikulum otodidak terstruktur, dan log sprint komputasi terdistribusi & rekayasa sistem.
            </p>
          </div>
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
            <button onClick={scrollToLogger} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold uppercase tracking-wider border border-purple-500/30 shadow-none active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Log Sesi Belajar</span>
            </button>
            <button onClick={() => setIsRoadmapModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-sans text-xs font-semibold uppercase tracking-wider border border-neutral-800/40 shadow-none transition-all">
              <span className="material-symbols-outlined text-[18px]">alt_route</span>
              <span>+ Tambah Materi / Roadmap</span>
            </button>
          </div>
        </div>
        
        {/* Live Telemetry KPI Strip */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800/40">
          {/* Streak */}
          <div className="p-5 rounded-2xl bg-surface-container border border-neutral-800/50 flex items-center gap-4 shadow-none">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary shadow-none flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">local_fire_department</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs uppercase tracking-wider text-outline font-semibold">Streak Konsistensi</span>
              </div>
              <div className="font-sans text-xl sm:text-2xl font-bold text-on-surface truncate">{streak} Hari</div>
              <span className="font-sans text-xs text-on-surface-variant">Terus pertahankan ritme belajar!</span>
            </div>
          </div>
          {/* Weekly Hours */}
          <div className="p-5 rounded-2xl bg-surface-container border border-neutral-800/50 flex items-center gap-4 shadow-none">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shadow-none flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs uppercase tracking-wider text-outline font-semibold">Sprint Minggu Ini</span>
              </div>
              <div className="font-sans text-xl sm:text-2xl font-bold text-on-surface truncate">{weeklyFocusHours}j {weeklyFocusMins}m</div>
              <span className="font-sans text-xs text-on-surface-variant">Total durasi fokus</span>
            </div>
          </div>
          {/* Level & XP */}
          <div className="p-5 rounded-2xl bg-surface-container border border-neutral-800/50 flex items-center gap-4 shadow-none">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-tertiary shadow-none flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">military_tech</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs uppercase tracking-wider text-outline font-semibold">Level Telemetry</span>
                <span className="font-sans text-xs font-semibold text-tertiary">{xp} XP</span>
              </div>
              <div className="font-sans text-base font-bold text-on-surface truncate">Tingkat Pengetahuan Aktif</div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min((xp % 1000) / 10, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Study Session Logger Panel */}
      <section ref={formRef} className="rounded-2xl bg-surface-container p-space-lg mb-space-lg shadow-md transition-all duration-300 scroll-mt-24">
        <div className="flex items-center justify-between pb-space-sm mb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold leading-tight flex items-center gap-2">
                Catat Sesi Belajar Baru
                {pendingSession && (
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-secondary font-label-sm text-label-sm animate-pulse whitespace-nowrap">
                    AUTO-FILLED
                  </span>
                )}
              </h2>
              <span className="font-label-sm text-label-sm text-outline">Selesaikan sprint dan sinkronisasikan perolehan XP kognitif</span>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> AUTO-SYNC KNOWLEDGE BASE
          </span>
        </div>
        
        <form className="space-y-space-md" onSubmit={handleLogSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            {/* Materi */}
            <div className="lg:col-span-5 space-y-1">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Materi / Topik Utama</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">code</span>
                <input value={logTitle} onChange={e => setLogTitle(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-high transition-colors" placeholder="mis. Implementasi Raft Heartbeat & Election Timer" required type="text"/>
              </div>
            </div>
            {/* Kategori */}
            <div className="lg:col-span-3 space-y-1">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Domain Rekayasa</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">category</span>
                <select value={logCategory} onChange={e => setLogCategory(e.target.value)} className="w-full h-11 pl-10 pr-8 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-high appearance-none transition-colors">
                  <option value="Tech & Engineering">Tech & Engineering</option>
                  <option value="Academic & School">Academic & School</option>
                  <option value="Language">Language</option>
                  <option value="Business & Career">Business & Career</option>
                  <option value="Creative / Lainnya">Creative / Lainnya</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-outline text-[18px] pointer-events-none">expand_more</span>
              </div>
            </div>
            {/* Durasi */}
            <div className="lg:col-span-2 space-y-1">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Durasi Waktu</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">timer</span>
                <input value={logDuration} onChange={e => setLogDuration(e.target.value)} className="w-full h-11 pl-10 pr-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-high transition-colors font-label-md" placeholder="60m" required type="text"/>
              </div>
            </div>
            {/* Perolehan XP Live Preview */}
            <div className="lg:col-span-2 flex flex-col justify-end">
              <div className="h-11 px-space-md rounded-xl bg-surface-container-high flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase">Output:</span>
                <span className="font-label-md text-label-md text-primary font-bold tracking-wide">+{parseInt(logDuration) || 0} XP</span>
              </div>
            </div>
          </div>
          
          {/* Key Takeaway Input */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Key Takeaway / Technical Synthesis</label>
            <div className="relative">
              <textarea value={logTakeaway} onChange={e => setLogTakeaway(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-high transition-colors resize-none" placeholder="Tuliskan 1-2 inti arsitektural atau bug resolution yang dipahami hari ini..." rows={2}></textarea>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-space-xs">
            <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
              <span>Sesi diverifikasi oleh Engine Telemetry Focus Ambis OS</span>
            </div>
            <button disabled={isSubmitting} className="px-space-lg py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold border border-purple-500/30 shadow-none transition-all flex items-center gap-space-sm active:scale-95 disabled:opacity-50" type="submit">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Sesi & Dapatkan XP'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Active Learning Paths */}
      <section className="mb-space-lg">
        <div className="flex items-center justify-between mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">account_tree</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                Active Learning Paths
              </h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Kurikulum komprehensif dengan metrik penyelesaian tahap demi tahap</p>
          </div>
          <div className="hidden sm:flex items-center gap-space-sm">
            <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">Total Sprints Active: {learningPaths.length}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg">
          {learningPaths.length > 0 ? learningPaths.map(path => (
            <div key={path.id} className="rounded-2xl bg-surface-container p-space-lg flex flex-col justify-between shadow-md relative overflow-hidden group hover:bg-surface-container-high transition-colors">
              <div className="space-y-space-md">
                {/* Card Header & Badge */}
                <div className="flex items-start justify-between gap-space-sm">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded font-label-sm text-label-sm font-semibold uppercase tracking-wider mb-1.5 ${path.categoryColorClass}`}>
                      {path.category}
                    </span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                      {path.title}
                    </h3>
                  </div>
                  {/* Radial-like mini visual badge */}
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex flex-col items-center justify-center flex-shrink-0">
                    <span className={`font-label-md text-label-md font-bold ${path.progressColorClass}`}>{path.progressPercent}%</span>
                    <span className="font-label-sm text-label-sm text-outline -mt-1">DONE</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between font-label-sm text-label-sm text-outline">
                    <span>Kurikulum Kemajuan</span>
                    <span className="text-on-surface font-semibold">{path.progressText}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                    <div className={`h-full bg-gradient-to-r rounded-full ${path.bgGradientClass}`} style={{ width: `${path.progressPercent}%` }}></div>
                  </div>
                </div>
                {/* Milestones Checklist */}
                <div className="space-y-2 pt-space-xs">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold block">Milestone Checklist:</span>
                  {path.milestones.map(milestone => (
                    <div key={milestone.id} className={`flex items-center gap-space-sm p-2 rounded-lg ${milestone.status === 'DONE' ? 'bg-surface-container-low' : milestone.status === 'ACTIVE' ? (path.id === '1' ? 'bg-secondary-container/10' : path.id === '2' ? 'bg-primary-container/15' : 'bg-tertiary-container/15') : 'bg-surface-container-low opacity-60'}`}>
                      <span className={`material-symbols-outlined text-[18px] ${milestone.status === 'DONE' ? path.progressColorClass : milestone.status === 'ACTIVE' ? `${path.progressColorClass} animate-pulse` : 'text-outline'}`}>
                        {milestone.status === 'DONE' ? 'check_circle' : milestone.status === 'ACTIVE' ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      {milestone.status === 'DONE' ? (
                        <span className="font-body-sm text-body-sm text-on-surface line-through opacity-70 truncate">{milestone.title}</span>
                      ) : milestone.status === 'ACTIVE' ? (
                        <div className="min-w-0 flex-1">
                          <span className={`font-body-sm text-body-sm font-semibold truncate block ${path.progressColorClass}`}>{milestone.title}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">{milestone.statusText}</span>
                        </div>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{milestone.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Card Footer Action */}
              <div className="mt-space-md pt-space-md space-y-space-sm">
                <div className="p-2.5 rounded-xl bg-surface-container-low">
                  <span className="font-label-sm text-label-sm text-outline uppercase block">Materi Berikutnya:</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate block">{path.nextMaterial}</span>
                </div>
                <button onClick={() => setSelectedPath(path)} className={`w-full py-2.5 px-space-md rounded-xl font-body-sm text-body-sm font-semibold hover:brightness-110 flex items-center justify-center gap-2 transition-all ${path.id === '1' ? 'bg-secondary-container text-on-secondary-container' : path.id === '2' ? 'bg-primary-container text-on-primary-container' : 'bg-tertiary text-on-tertiary'}`}>
                  <span>Lanjutkan Belajar</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-1 xl:col-span-3 py-space-xl text-center rounded-2xl bg-surface-container shadow-md">
              <span className="material-symbols-outlined text-outline text-[48px] mb-2">account_tree</span>
              <p className="font-body-lg text-on-surface-variant font-semibold">Belum ada materi belajar</p>
              <p className="font-body-sm text-outline mb-4">Tambahkan materi atau roadmap baru untuk mulai melacak progres belajar.</p>
              <button onClick={() => setIsRoadmapModalOpen(true)} className="px-space-md py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-semibold mx-auto transition-all">
                + Tambah Materi Baru
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Split Grid: Resource Library & Recent Study History */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg mb-space-lg">
        {/* Learning Materials & Resource Library (8 cols) */}
        <div className="xl:col-span-8 rounded-2xl bg-surface-container p-space-lg shadow-md flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">local_library</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Resource Library & Papers
                  </h2>
                  <span className="font-label-sm text-label-sm text-outline">Buku teks, RFC, kursus, dan dokumentasi mendalam</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-sm text-label-sm text-outline">FILTER:</span>
                <div className="relative">
                  <button className="px-space-sm py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                    <span>{resourceFilter} ({filteredResources.length})</span>
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter Pill Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-space-sm mb-space-md no-scrollbar">
              {['Semua', 'Tech & Engineering', 'Academic & School', 'Language', 'Business & Career', 'Creative / Lainnya'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setResourceFilter(f)}
                  className={`px-3 py-1 rounded-lg font-label-sm text-label-sm flex-shrink-0 transition-colors ${resourceFilter === f ? 'bg-primary-container text-on-primary-container font-semibold' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'}`}
                >
                  {f} {resourceFilter === f && `(${filteredResources.length})`}
                </button>
              ))}
            </div>
            
            {/* Resource Table / Cards */}
            <div className="space-y-space-sm">
              {filteredResources.length > 0 ? filteredResources.map(resource => (
                <div key={resource.id} className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                  <div className="flex items-start gap-space-md min-w-0">
                    <div className={`w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0 ${resource.colorClass}`}>
                      <span className="material-symbols-outlined text-[22px]">{resource.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest uppercase font-semibold ${resource.colorClass}`}>{resource.type}</span>
                        <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest font-semibold ${resource.difficulty === 'Advanced' ? 'text-error' : 'text-secondary'}`}>{resource.difficulty}</span>
                        <span className="font-label-sm text-label-sm text-outline">{resource.publisher}</span>
                      </div>
                      <h4 className="font-body-lg text-body-lg text-on-surface font-semibold truncate mt-0.5">
                        {resource.title}
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{resource.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-md flex-shrink-0">
                    {resource.status === 'COMPLETED' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-tertiary font-semibold">
                          Completed <span className="material-symbols-outlined text-[14px]">check</span>
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-surface-container-highest mt-1 overflow-hidden">
                          <div className="h-full bg-tertiary rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    ) : resource.status === 'NOT_STARTED' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-outline">
                          Not Started · 0%
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-surface-container-highest mt-1 overflow-hidden">
                          <div className="h-full bg-outline rounded-full" style={{ width: '0%' }}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold ${resource.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${resource.colorClass.replace('text-', 'bg-')}`}></span>
                          Learning · {resource.progressPercent}%
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-surface-container-highest mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${resource.colorClass.replace('text-', 'bg-')}`} style={{ width: `${resource.progressPercent}%` }}></div>
                        </div>
                      </div>
                    )}
                    <button className="w-8 h-8 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface-variant flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[18px]">{resource.status === 'NOT_STARTED' ? 'play_arrow' : resource.status === 'COMPLETED' ? 'task_alt' : 'open_in_new'}</span>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-space-xl text-center rounded-xl bg-surface-container-low border border-surface-container-highest">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-2">library_books</span>
                  <p className="font-body-md text-outline">Belum ada resource atau paper di kategori ini.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-space-md pt-space-md border-t border-surface-container-highest">
            <span className="font-label-sm text-label-sm text-outline">Menampilkan {filteredResources.length} dari {resources.length} repositori pengetahuan</span>
            <button onClick={() => navigate('/knowledge-base')} className="font-label-sm text-label-sm text-primary hover:text-primary-fixed font-semibold flex items-center gap-1 transition-colors">
              Buka Seluruh Arsip ({resources.length} Materi) <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
        
        {/* Sprint Log History (4 cols) */}
        <div className="xl:col-span-4 rounded-2xl bg-surface-container p-space-lg shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">history_edu</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Sprint Log History
                </h2>
                <span className="font-label-sm text-label-sm text-outline">3 sesi kognitif terakhir</span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-space-md pr-1">
            {studyLogs.length > 0 ? studyLogs.map(log => (
              <div key={log.id} className="relative pl-space-md border-l-2 border-surface-container-highest pb-space-sm">
                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-surface-container-highest"></div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-secondary font-bold tracking-wider">{log.dateStr}</span>
                    <span className="font-label-sm text-label-sm text-outline">· {log.timeStr}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm font-bold">+{log.xp} XP</span>
                </div>
                <h4 className="font-body-md text-body-md font-bold text-on-surface mb-1">
                  {log.title}
                </h4>
                <div className="flex items-center gap-space-sm text-on-surface-variant font-label-sm text-label-sm mb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">timer</span> {log.duration}
                  </span>
                  <span>·</span>
                  <span>{log.category}</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-low border border-surface-container-highest">
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                    {log.takeaway}
                  </p>
                </div>
              </div>
            )) : (
              <div className="py-space-md text-center">
                <span className="material-symbols-outlined text-outline text-[32px] mb-2">history</span>
                <p className="font-body-sm text-outline">Belum ada riwayat sprint log.</p>
              </div>
            )}
          </div>
          
          <div className="mt-space-md pt-space-md border-t border-surface-container-highest">
            <div className="flex items-center gap-space-sm p-3 rounded-xl bg-surface-container-low border border-surface-container-highest text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">shield_moon</span>
              <div className="font-label-sm text-label-sm font-bold flex-1 flex justify-between">
                <span>Target Harian: 130 XP</span>
                <span>{Math.min(Math.round((xp / 130) * 100), 100)}% COMPLETE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cognitive Velocity Doctrine */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-lg relative overflow-hidden border border-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex items-start gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">psychology</span>
          </div>
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest">Cognitive Velocity Doctrine</span>
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold italic mb-2 tracking-tight">
              "Master the fundamentals, and the complexity yields."
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Pola berpikir arsitektural dibangun dari pengulangan konsep dasar berbobot tinggi. Pastikan setiap sprint tercatat untuk menjamin akumulasi compound knowledge.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 flex-shrink-0 w-full md:w-auto p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex items-center gap-space-md">
          <span className="material-symbols-outlined text-secondary text-[24px]">headphones</span>
          <div className="flex flex-col min-w-[140px]">
            <span className="font-body-sm text-body-sm font-semibold text-on-surface">Binaural Isochronic Pulse</span>
            <span className="font-label-sm text-label-sm text-outline">Frequency: 14Hz Beta Focus</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors shadow-none">
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
          </button>
        </div>
      </section>

      {/* ROADMAP MODAL */}
      {isRoadmapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-md w-full shadow-2xl space-y-space-md border border-surface-container-highest">
            <h2 className="font-headline-md text-on-surface font-bold">Tambah Learning Path</h2>
            <div className="space-y-3">
              <div>
                <label className="block font-label-sm text-outline mb-1">Judul Roadmap</label>
                <input value={roadmapForm.title} onChange={e => setRoadmapForm({...roadmapForm, title: e.target.value})} className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Mis. Kubernetes CKA" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-sm text-outline mb-1">Domain</label>
                  <select value={roadmapForm.domain} onChange={e => setRoadmapForm({...roadmapForm, domain: e.target.value})} className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2">
                    <option value="Tech & Engineering">Tech & Engineering</option>
                    <option value="Academic & School">Academic & School</option>
                    <option value="Language">Language</option>
                    <option value="Business & Career">Business & Career</option>
                    <option value="Creative / Lainnya">Creative / Lainnya</option>
                    <option value="Custom">Custom...</option>
                  </select>
                  {roadmapForm.domain === 'Custom' && (
                    <input value={roadmapForm.customDomain} onChange={e => setRoadmapForm({...roadmapForm, customDomain: e.target.value})} placeholder="Ketik domain kustom..." className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  )}
                </div>
                <div>
                  <label className="block font-label-sm text-outline mb-1">Target Selesai</label>
                  <input type="text" value={roadmapForm.deadline} onChange={e => setRoadmapForm({...roadmapForm, deadline: e.target.value})} className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Mis. Akhir Bulan" />
                </div>
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">Deskripsi / Modul Awal</label>
                <textarea value={roadmapForm.description} onChange={e => setRoadmapForm({...roadmapForm, description: e.target.value})} className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" rows={2} placeholder="Brief deskripsi..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsRoadmapModalOpen(false)} className="px-4 py-2 rounded-lg font-label-md text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
              <button onClick={handleCreateRoadmap} className="px-4 py-2 rounded-lg font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MATERIAL DETAIL MODAL */}
      <MaterialDetailModal 
        isOpen={!!selectedPath} 
        onClose={() => setSelectedPath(null)} 
        path={selectedPath} 
        onUpdate={fetchData} 
      />
    </div>
  );
};

export default StudySpace;
