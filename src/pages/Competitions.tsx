import { useState, useEffect } from 'react';
import { competitionApi } from '../api';

interface CompChecklist {
  id: string;
  title: string;
  isChecked: boolean;
}

interface Competition {
  id: string;
  category: 'active' | 'preparing' | 'submitted' | 'finalist' | 'wishlist' | 'finished';
  organizer: string;
  title: string;
  division: string;
  badgeText: string;
  badgeClass: string;
  isPulsing?: boolean;
  registrationOrStatusText: string;
  registrationOrStatusValue: string;
  deadlineDate: Date | null;
  deadlineText: string;
  deadlineValue: string;
  progressLabel: string;
  progressPercent: number;
  progressColorClass: string;
  prizePool: number;
  checklist: CompChecklist[];
  timeline: {
    registration?: string;
    submission?: string;
    announcement?: string;
  };
  outcome: string;
  links: { label: string; url: string }[];
  documentationImages: string[];
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const getDaysDifference = (date: Date) => {
  const diffTime = date.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const mapBackendToFrontend = (bc: any): Competition => {
  let category: Competition['category'] = 'preparing';
  const status = bc.status || 'preparation';
  
  if (status === 'completed' || status === 'finished') category = 'finished';
  else if (status === 'active') category = 'active';
  else if (status === 'wishlist') category = 'wishlist';
  else if (status === 'finalist') category = 'finalist';
  else if (status === 'submitted') category = 'submitted';
  else if (status === 'preparation' || status === 'preparing') category = 'preparing';

  let badgeText = 'PREPARING';
  let badgeClass = 'bg-surface-container-high text-on-surface-variant';
  let isPulsing = false;

  if (category === 'active') {
    badgeText = 'ACTIVE SPRINT';
    badgeClass = 'bg-primary-container text-primary';
    isPulsing = true;
  } else if (category === 'finished') {
    badgeText = 'Finished';
    badgeClass = 'bg-surface-container-highest text-on-surface-variant';
  } else if (category === 'wishlist') {
    badgeText = 'WISHLIST';
    badgeClass = 'bg-surface-container text-outline';
  } else if (category === 'submitted') {
    badgeText = 'SUBMITTED';
    badgeClass = 'bg-tertiary-container/50 text-tertiary';
  } else if (category === 'finalist') {
    badgeText = 'FINALIST';
    badgeClass = 'bg-secondary-container/50 text-secondary border border-secondary/30';
  }

  // Parse description for JSON
  let prizePool = 0;
  let checklist: CompChecklist[] = [];
  try {
    const parsed = JSON.parse(bc.description || '{}');
    if (parsed && parsed.isJSONCompDesc) {
      prizePool = parsed.prizePool || 0;
      checklist = parsed.checklist || [];
    }
  } catch (e) {
    // String
  }

  // Calculate Progress based on checklist
  let progressPercent = 0;
  if (checklist.length > 0) {
    const doneCount = checklist.filter(c => c.isChecked).length;
    progressPercent = Math.round((doneCount / checklist.length) * 100);
  } else {
    // Default fallback
    if (category === 'finished' || category === 'submitted') progressPercent = 100;
    else if (category === 'active') progressPercent = 50;
  }

  let progressColorClass = 'bg-primary';
  if (category === 'finished' || progressPercent === 100) progressColorClass = 'bg-secondary';
  else if (category === 'wishlist') progressColorClass = 'bg-surface-container-highest';
  else if (category === 'submitted') progressColorClass = 'bg-tertiary';
  else if (category === 'finalist') progressColorClass = 'bg-secondary';

  const deadlineDate = bc.deadline ? new Date(bc.deadline) : null;
  let deadlineValue = 'TBA';
  
  if (deadlineDate) {
    const days = getDaysDifference(deadlineDate);
    if (days < 0) {
      deadlineValue = 'Berakhir';
    } else if (days === 0) {
      deadlineValue = 'Hari Ini!';
    } else if (days === 1) {
      deadlineValue = 'Besok';
    } else if (days <= 7) {
      deadlineValue = `${days} hari lagi`;
    } else {
      deadlineValue = deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  return {
    id: bc.id,
    category,
    organizer: bc.organizer || 'Unknown Organizer',
    title: bc.title,
    division: bc.type || 'General Division',
    badgeText,
    badgeClass,
    isPulsing,
    registrationOrStatusText: 'Status',
    registrationOrStatusValue: category === 'finished' ? 'Finished' : (category === 'finalist' ? 'Finalist' : (category === 'submitted' ? 'Waiting Result' : 'In Progress')),
    deadlineDate,
    deadlineText: 'Deadline',
    deadlineValue,
    progressLabel: 'Progress',
    progressPercent,
    progressColorClass,
    prizePool,
    checklist,
    timeline: bc.timeline || {},
    outcome: bc.outcome || '',
    links: Array.isArray(bc.links) ? bc.links : [],
    documentationImages: Array.isArray(bc.documentation_images) ? bc.documentation_images : []
  };
};

const Competitions = () => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [activeTab, setActiveTab] = useState('all');
  const [sortOption, setSortOption] = useState('deadline');
  
  const tabs = [
    { id: 'all', label: 'Semua' },
    { id: 'active', label: 'Active Focus' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'finished', label: 'Finished / Archive' }
  ];

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [showBulkPasteReq, setShowBulkPasteReq] = useState(false);
  const [bulkPasteReqText, setBulkPasteReqText] = useState('');
  const [form, setForm] = useState({
    title: '',
    organizer: '',
    type: 'Software Engineering',
    deadline: '',
    status: 'preparing',
    prizePool: 0,
    checklist: [{ id: Date.now().toString(), title: '', isChecked: false }],
    timeline: { registration: '', submission: '', announcement: '' },
    outcome: '',
    links: [] as { label: string; url: string }[],
    documentationImages: [] as string[]
  });

  const fetchCompetitions = async () => {
    try {
      setIsLoading(true);
      const res = await competitionApi.getAll();
      setCompetitions(res.data.map(mapBackendToFrontend));
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const openEditModal = (comp: Competition) => {
    setEditingCompId(comp.id);
    setShowBulkPasteReq(false);
    setBulkPasteReqText('');
    setForm({
      title: comp.title,
      organizer: comp.organizer,
      type: comp.division,
      deadline: comp.deadlineDate ? comp.deadlineDate.toISOString().split('T')[0] : '',
      status: comp.category === 'finished' ? 'finished' : comp.category,
      prizePool: comp.prizePool,
      checklist: comp.checklist.length > 0 ? comp.checklist : [{ id: Date.now().toString(), title: '', isChecked: false }],
      timeline: { 
        registration: comp.timeline?.registration || '', 
        submission: comp.timeline?.submission || '', 
        announcement: comp.timeline?.announcement || '' 
      },
      outcome: comp.outcome,
      links: comp.links,
      documentationImages: comp.documentationImages
    });
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async () => {
    if (!form.title) return;
    setIsLoading(true);
    try {
      const validChecklist = form.checklist.filter(c => c.title.trim() !== '');
      const payloadDesc = JSON.stringify({
        isJSONCompDesc: true,
        prizePool: form.prizePool,
        checklist: validChecklist
      });

      const data = {
        title: form.title,
        type: form.type,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        status: form.status,
        description: payloadDesc,
        organizer: form.organizer || 'Competition Event',
        timeline: form.timeline,
        outcome: form.outcome,
        links: form.links,
        documentation_images: form.documentationImages
      };

      if (editingCompId) {
        await competitionApi.update(editingCompId, data);
      } else {
        await competitionApi.create(data);
      }

      setIsModalOpen(false);
      setEditingCompId(null);
      setShowBulkPasteReq(false);
      setBulkPasteReqText('');
      setForm({
        title: '',
        organizer: '',
        type: 'Software Engineering',
        deadline: '',
        status: 'preparing',
        prizePool: 0,
        checklist: [{ id: Date.now().toString(), title: '', isChecked: false }],
        timeline: { registration: '', submission: '', announcement: '' },
        outcome: '',
        links: [],
        documentationImages: []
      });
      fetchCompetitions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kompetisi ini?')) return;
    try {
      await competitionApi.delete(id);
      setCompetitions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChecklist = async (compId: string, checkId: string) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;

    const updatedChecklist = comp.checklist.map(c => 
      c.id === checkId ? { ...c, isChecked: !c.isChecked } : c
    );

    const payloadDesc = JSON.stringify({
      isJSONCompDesc: true,
      prizePool: comp.prizePool,
      checklist: updatedChecklist
    });

    // Optimistic
    let newProgress = comp.progressPercent;
    if (updatedChecklist.length > 0) {
      const doneCount = updatedChecklist.filter(c => c.isChecked).length;
      newProgress = Math.round((doneCount / updatedChecklist.length) * 100);
    }

    setCompetitions(prev => prev.map(c => 
      c.id === compId ? { ...c, checklist: updatedChecklist, progressPercent: newProgress } : c
    ));

    try {
      await competitionApi.update(compId, { description: payloadDesc });
    } catch (err) {
      console.error(err);
      fetchCompetitions();
    }
  };

  const handleBulkPasteReq = () => {
    const lines = bulkPasteReqText.split('\n');
    const newReqs = lines.map(line => {
      let cleanTitle = line.trim();
      cleanTitle = cleanTitle.replace(/^(?:\d+[\.\)]\s*|-\s*|\*\s*)/, '').trim();
      return cleanTitle;
    }).filter(t => t.length > 0);

    if (newReqs.length > 0) {
      const addedReqs = newReqs.map((t, i) => ({
        id: Date.now().toString() + i,
        title: t,
        isChecked: false
      }));
      
      setForm(prev => {
        let current = prev.checklist;
        if (current.length === 1 && current[0].title === '') {
          current = [];
        }
        return {
          ...prev,
          checklist: [...current, ...addedReqs]
        };
      });
      setBulkPasteReqText('');
      setShowBulkPasteReq(false);
    }
  };

  // Metrics Logic
  const activeAndPrep = competitions.filter(c => c.category === 'active' || c.category === 'preparing');
  const targetKritisCount = activeAndPrep.filter(c => c.deadlineDate && getDaysDifference(c.deadlineDate) <= 7 && getDaysDifference(c.deadlineDate) >= 0).length;
  const targetPoolTotal = activeAndPrep.reduce((sum, c) => sum + (Number(c.prizePool) || 0), 0);
  
  let auditSubmisiText = '0% Ready';
  let auditSubmisiSub = '0/0 Persyaratan Selesai';
  if (activeAndPrep.length > 0) {
    const compsWithDeadline = activeAndPrep.filter(c => c.deadlineDate && getDaysDifference(c.deadlineDate) >= 0);
    if (compsWithDeadline.length > 0) {
      const closest = compsWithDeadline.sort((a, b) => a.deadlineDate!.getTime() - b.deadlineDate!.getTime())[0];
      const done = closest.checklist.filter(c => c.isChecked).length;
      const total = closest.checklist.length;
      const pct = total > 0 ? Math.round((done/total)*100) : 0;
      auditSubmisiText = `${pct}% Ready`;
      auditSubmisiSub = `${done}/${total} Persyaratan Selesai`;
    }
  }

  // Filter & Sorting Logic
  let filtered = activeTab === 'all' ? competitions : competitions.filter(c => c.category === activeTab);
  filtered = [...filtered].sort((a, b) => {
    if (sortOption === 'deadline') {
      const d1 = a.deadlineDate ? a.deadlineDate.getTime() : Infinity;
      const d2 = b.deadlineDate ? b.deadlineDate.getTime() : Infinity;
      return d1 - d2;
    } else if (sortOption === 'prize') {
      return b.prizePool - a.prizePool;
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-on-surface-variant animate-pulse">Memuat kompetisi...</p>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
            <span className="material-symbols-outlined text-[14px]">trophy</span>
            <span>COMMAND DECK</span>
            <span className="text-outline/40">/</span>
            <span>COMPETITIONS ARENA</span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-bold">ACTIVE PREPARATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface font-sans">
            Competitions & Hackathon War Room
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed font-sans">
            Pelacak arena kompetisi teknologi, hackathon, dan data science dengan pemantauan tenggat waktu ketat, sinkronisasi milestone tim, serta audit kesiapan berkas submisi.
          </p>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative inline-flex">
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)} 
              className="px-4 py-2.5 pl-9 pr-8 rounded-xl bg-surface-container-low border border-neutral-800/50 text-on-surface text-xs sm:text-sm font-medium hover:bg-surface-container transition-colors appearance-none cursor-pointer outline-none"
            >
              <option value="deadline">Deadline Terdekat</option>
              <option value="prize">Prize Pool Terbesar</option>
              <option value="name">Nama A-Z</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">sort</span>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">expand_more</span>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Tambah Kompetisi Baru</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Pulse Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Target Kritis</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">alarm_on</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-tertiary tracking-tight leading-none font-sans">
              {targetKritisCount}
            </span>
            <span className="text-xs text-tertiary font-semibold">Arena</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>{targetKritisCount > 0 ? '< 7 Hari Tersisa' : 'Tidak ada target mendesak'}</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Pipeline Tahap Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{activeAndPrep.length}</span>
            <span className="text-xs text-secondary font-semibold">Arena</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Active / Preparing</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Target Pool Ekuitas</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-bold text-secondary tracking-tight leading-none font-sans">
              {formatRupiah(targetPoolTotal)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>Total Potensi Prize</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Audit Submisi Terdekat</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-primary tracking-tight leading-none font-sans">{auditSubmisiText}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>{auditSubmisiSub}</span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
              activeTab === tab.id 
                ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Competitions Cards Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {filtered.map(comp => (
          <div key={comp.id} className={`bg-surface-container-low rounded-2xl flex flex-col relative hover:border-neutral-700/60 transition-all duration-200 border border-neutral-800/50 shadow-none overflow-hidden`}>
            
            {/* Card Header: Category + Status + Actions */}
            <div className="px-5 pt-5 pb-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                {/* Left: Division badge + Status badge */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-secondary uppercase font-bold tracking-widest font-mono">
                    {comp.division}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${comp.badgeClass}`}>
                    {comp.isPulsing && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0"></span>}
                    {comp.badgeText === 'Finished' && <span className="material-symbols-outlined text-[13px]">workspace_premium</span>}
                    {comp.badgeText}
                  </span>
                </div>
                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => openEditModal(comp)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-colors" title="Edit Kompetisi">
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(comp.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors" title="Hapus">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Title + Organizer + Prize */}
              <div>
                <h3 className="text-base font-bold text-on-surface tracking-tight leading-snug">
                  {comp.title}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">business</span>
                    {comp.organizer}
                  </span>
                  {comp.prizePool > 0 && (
                    <span className="text-xs font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">payments</span>
                      {formatRupiah(comp.prizePool)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mini Timeline Section */}
            {(comp.timeline?.registration || comp.timeline?.submission || comp.timeline?.announcement) && (
              <div className="mx-5 mb-3 p-3 rounded-xl bg-surface-container/60 border border-neutral-800/40">
                <span className="text-[10px] uppercase font-bold tracking-widest text-outline mb-2 block">Timeline Penting</span>
                <div className="flex items-center gap-0">
                  {[
                    { label: 'Daftar', val: comp.timeline?.registration, icon: 'login' },
                    { label: 'Submit', val: comp.timeline?.submission, icon: 'upload_file' },
                    { label: 'Umumkan', val: comp.timeline?.announcement, icon: 'campaign' },
                  ].filter(t => t.val).map((t, idx, arr) => (
                    <div key={idx} className="flex items-center">
                      <div className="flex flex-col items-center text-center min-w-[72px]">
                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-1">
                          <span className="material-symbols-outlined text-[12px]">{t.icon}</span>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-outline tracking-wider leading-tight">{t.label}</span>
                        <span className="text-[10px] font-semibold text-on-surface mt-0.5 leading-tight">{t.val}</span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="flex-1 h-px bg-neutral-800 mx-1 mb-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mx-5 mb-3 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-outline uppercase text-[10px] font-bold tracking-wider">Readiness</span>
                <span className={`font-bold font-mono ${
                  comp.progressPercent === 100 ? 'text-secondary' :
                  comp.category === 'active' ? 'text-primary' : 'text-on-surface-variant'
                }`}>{comp.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    comp.progressPercent === 100 ? 'bg-gradient-to-r from-secondary to-secondary-fixed' :
                    comp.category === 'active' ? 'bg-gradient-to-r from-primary/70 to-primary' :
                    comp.progressColorClass
                  }`}
                  style={{ width: `${comp.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Deliverables / Checklist */}
            {comp.checklist.length > 0 && (
              <div className="mx-5 mb-4 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-outline">Deliverables</span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {comp.checklist.map(chk => (
                    <div
                      key={chk.id}
                      onClick={() => toggleChecklist(comp.id, chk.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        chk.isChecked ? 'bg-secondary/8' : 'bg-surface-container/60 hover:bg-surface-container'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[17px] flex-shrink-0 ${chk.isChecked ? 'text-secondary' : 'text-outline'}`}
                        style={{ fontVariationSettings: chk.isChecked ? "'FILL' 1" : undefined }}
                      >
                        {chk.isChecked ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className={`text-xs font-medium flex-1 ${chk.isChecked ? 'text-outline line-through' : 'text-on-surface'}`}>
                        {chk.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deadline + Status Row */}
            <div className="mx-5 mb-4 flex items-center justify-between p-2.5 rounded-xl bg-surface-container/50 border border-neutral-800/30">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-outline">schedule</span>
                <span className="text-xs text-outline">Deadline:</span>
                <span className={`text-xs font-bold ${
                  comp.deadlineValue === 'Hari Ini!' || comp.deadlineValue === 'Besok'
                    ? 'text-error' : 'text-on-surface'
                }`}>{comp.deadlineValue}</span>
              </div>
              <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                {comp.registrationOrStatusValue}
              </span>
            </div>

            {/* Outcome */}
            {comp.outcome && (
              <div className="mx-5 mb-3 p-2.5 bg-primary-container/10 border border-primary/20 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-primary block mb-0.5 tracking-wider">Outcome / Prestasi</span>
                <p className="text-xs text-on-surface leading-relaxed">{comp.outcome}</p>
              </div>
            )}

            {/* Links Footer */}
            {comp.links.length > 0 && (
              <div className="mx-5 mb-5 flex flex-wrap gap-1.5 pt-3 border-t border-neutral-800/30">
                {comp.links.map((lnk, idx) => {
                  // Auto-detect icon from label
                  const label = lnk.label.toLowerCase();
                  const icon = label.includes('figma') || label.includes('design') ? 'design_services'
                    : label.includes('github') || label.includes('repo') ? 'code'
                    : label.includes('canva') ? 'brush'
                    : label.includes('drive') ? 'folder'
                    : label.includes('notion') || label.includes('doc') || label.includes('prd') ? 'description'
                    : 'link';
                  return (
                    <a
                      key={idx}
                      href={lnk.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 transition-colors text-xs font-semibold text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[13px] text-secondary">{icon}</span>
                      {lnk.label}
                    </a>
                  );
                })}
              </div>
            )}

            {!comp.links.length && <div className="mb-2" />}
          </div>
        ))}
        
        {filtered.length === 0 && !isLoading && (
          <div className="lg:col-span-3 py-12 text-center flex flex-col items-center gap-2 bg-surface-container/30 border border-neutral-800/50 rounded-2xl">
            <span className="material-symbols-outlined text-outline/60 text-[36px]">trophy</span>
            <p className="text-xs text-outline font-medium">Tidak ada kompetisi di kategori ini.</p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] border border-neutral-800/50">
            <h2 className="text-xl font-bold text-on-surface mb-4 font-sans">
              {editingCompId ? 'Edit Kompetisi / Hackathon' : 'Tambah Kompetisi / Hackathon Baru'}
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Nama Kompetisi / Hackathon</label>
                  <input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. Gemastik 2026 - Data Mining" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Kategori / Track</label>
                  <input 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. UI/UX, AI/ML..." 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Deadline Submisi</label>
                  <input 
                    type="date"
                    value={form.deadline} 
                    onChange={e => setForm({...form, deadline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Tahap Pipeline</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active Focus</option>
                    <option value="preparing">Preparing</option>
                    <option value="submitted">Submitted</option>
                    <option value="finalist">Finalist</option>
                    <option value="wishlist">Wishlist</option>
                    <option value="finished">Finished / Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Prize Pool (IDR)</label>
                  <input 
                    type="number"
                    value={form.prizePool || ''} 
                    onChange={e => setForm({...form, prizePool: Number(e.target.value)})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. 10000000" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tgl Registrasi (Opt)</label>
                  <input type="date" value={form.timeline.registration} onChange={e => setForm({...form, timeline: {...form.timeline, registration: e.target.value}})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" />
                </div>
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tgl Submisi (Opt)</label>
                  <input type="date" value={form.timeline.submission} onChange={e => setForm({...form, timeline: {...form.timeline, submission: e.target.value}})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" />
                </div>
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tgl Pengumuman (Opt)</label>
                  <input type="date" value={form.timeline.announcement} onChange={e => setForm({...form, timeline: {...form.timeline, announcement: e.target.value}})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Outcome / Hasil</label>
                <textarea value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" rows={2} placeholder="Mis. Juara 1 Nasional..." />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline">Persyaratan Submisi / Checklist</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowBulkPasteReq(!showBulkPasteReq)} className="text-secondary text-xs font-semibold hover:text-secondary-fixed cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">content_paste</span> {showBulkPasteReq ? 'Tutup Bulk Paste' : 'Bulk Paste (AI)'}
                    </button>
                    <button onClick={() => setForm(p => ({...p, checklist: [...p.checklist, {id: Date.now().toString(), title: '', isChecked: false}]}))} className="text-primary text-xs font-semibold hover:text-primary-fixed cursor-pointer flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span> Tambah Dokumen
                    </button>
                  </div>
                </div>
                {showBulkPasteReq && (
                  <div className="mb-3 p-3 bg-surface-container/30 border border-secondary/30 rounded-xl space-y-2">
                    <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider">Paste Teks dari AI (Baris per baris)</label>
                    <textarea
                      value={bulkPasteReqText}
                      onChange={e => setBulkPasteReqText(e.target.value)}
                      className="w-full bg-surface-container text-on-surface px-3 py-2 rounded-lg text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                      rows={4}
                      placeholder="1. Proposal PDF&#10;2. Pitch Deck PPT&#10;- Atau format bullet list"
                    />
                    <div className="flex justify-end">
                      <button onClick={handleBulkPasteReq} className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-semibold flex items-center gap-1 hover:bg-secondary-fixed transition-colors">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Konversi Teks
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {form.checklist.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest text-outline flex items-center justify-center text-xs font-semibold flex-shrink-0">{idx + 1}</div>
                      <input 
                        value={m.title}
                        onChange={e => {
                          const newM = [...form.checklist];
                          newM[idx].title = e.target.value;
                          setForm({...form, checklist: newM});
                        }}
                        className="flex-1 bg-surface-container text-on-surface px-3 py-2 rounded-lg text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Mis. Pitch Deck PDF"
                      />
                      <button onClick={() => {
                        const newM = [...form.checklist];
                        newM.splice(idx, 1);
                        setForm({...form, checklist: newM});
                      }} className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-label-sm text-outline uppercase tracking-wider font-semibold">Links (Github, Figma, dll)</label>
                  <button onClick={() => setForm(p => ({...p, links: [...p.links, {label: '', url: ''}]}))} className="text-primary font-label-sm text-label-sm font-semibold hover:text-primary-fixed">+ Tambah Link</button>
                </div>
                <div className="space-y-2">
                  {form.links.map((lnk, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input value={lnk.label} onChange={e => { const newL = [...form.links]; newL[idx].label = e.target.value; setForm({...form, links: newL}); }} className="w-1/3 bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" placeholder="Label (Mis. Github)" />
                      <input value={lnk.url} onChange={e => { const newL = [...form.links]; newL[idx].url = e.target.value; setForm({...form, links: newL}); }} className="flex-1 bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" placeholder="URL Link" />
                      <button onClick={() => { const newL = [...form.links]; newL.splice(idx, 1); setForm({...form, links: newL}); }} className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-neutral-800/50">
              <button onClick={() => {setIsModalOpen(false); setEditingCompId(null);}} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
              <button onClick={handleSaveSubmit} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors border border-purple-500/30 flex items-center gap-2 shadow-none cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">save</span> {editingCompId ? 'Update Kompetisi' : 'Simpan Kompetisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competitions;
