import { useState, useEffect } from 'react';
import { competitionApi } from '../api';

interface CompChecklist {
  id: string;
  title: string;
  isChecked: boolean;
}

interface Competition {
  id: string;
  category: 'active' | 'preparing' | 'submitted' | 'wishlist' | 'finished';
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
  else if (status === 'submitted') category = 'submitted';
  else if (status === 'preparation' || status === 'preparing') category = 'preparing';

  let badgeText = 'PREPARING';
  let badgeClass = 'bg-surface-container-high text-on-surface-variant';
  let isPulsing = false;

  if (category === 'active') {
    badgeText = 'ACTIVE SPRINT';
    badgeClass = 'bg-primary-container text-primary shadow-[0_0_12px_rgba(208,188,255,0.4)]';
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
    registrationOrStatusValue: category === 'finished' ? 'Finished' : (category === 'submitted' ? 'Waiting Result' : 'In Progress'),
    deadlineDate,
    deadlineText: 'Deadline',
    deadlineValue,
    progressLabel: 'Progress',
    progressPercent,
    progressColorClass,
    prizePool,
    checklist
  };
};

const Competitions = () => {
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
  const [form, setForm] = useState({
    title: '',
    type: 'Software Engineering',
    deadline: '',
    status: 'preparing',
    prizePool: 0,
    checklist: [{ id: Date.now().toString(), title: '', isChecked: false }]
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

  const handleCreateSubmit = async () => {
    if (!form.title) return;
    setIsLoading(true);
    try {
      const validChecklist = form.checklist.filter(c => c.title.trim() !== '');
      const payloadDesc = JSON.stringify({
        isJSONCompDesc: true,
        prizePool: form.prizePool,
        checklist: validChecklist
      });

      await competitionApi.create({
        title: form.title,
        type: form.type,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        status: form.status,
        description: payloadDesc,
        organizer: 'Competition Event'
      });

      setIsModalOpen(false);
      setForm({
        title: '',
        type: 'Software Engineering',
        deadline: '',
        status: 'preparing',
        prizePool: 0,
        checklist: [{ id: Date.now().toString(), title: '', isChecked: false }]
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
    <div className="flex flex-col w-full relative">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="font-body-md text-on-surface-variant animate-pulse">Memuat kompetisi...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-space-lg">
        {/* Top Breadcrumb & Actions Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm tracking-widest text-secondary uppercase">
              <span>Command Deck</span>
              <span className="material-symbols-outlined text-[12px] text-outline">chevron_right</span>
              <span>Competitions Arena</span>
              <span className="material-symbols-outlined text-[12px] text-outline">chevron_right</span>
              <span className="text-primary font-bold">Active Preparation</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
              Competitions & Hackathon War Room
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
              Pelacak arena kompetisi teknologi, hackathon, dan data science dengan pemantauan tenggat waktu ketat, sinkronisasi milestone tim, serta audit kesiapan berkas submisi.
            </p>
          </div>
          <div className="flex items-center gap-space-sm self-start xl:self-auto flex-wrap">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2.5 rounded-xl border border-surface-container-highest relative cursor-pointer">
              <span className="material-symbols-outlined text-outline text-[18px]">sort</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase pointer-events-none">Urutkan:</span>
              <select 
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value)} 
                className="bg-transparent font-label-sm text-label-sm text-secondary font-semibold appearance-none outline-none cursor-pointer pr-4"
              >
                <option value="deadline">Deadline Terdekat</option>
                <option value="prize">Prize Pool Terbesar</option>
                <option value="name">Nama A-Z</option>
              </select>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-space-xs bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md px-space-lg py-2.5 rounded-xl shadow-[0_0_24px_-2px_rgba(208,188,255,0.4)] transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span className="tracking-wide uppercase font-semibold">+ Tambah Kompetisi Baru</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Pulse Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Target Kritis</span>
              <span className="w-7 h-7 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">alarm_on</span>
              </span>
            </div>
            <div className="mt-space-sm">
              <div className="font-metric-display text-metric-display text-tertiary leading-none font-bold">
                {targetKritisCount} Arena
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                <span>{targetKritisCount > 0 ? '&lt; 7 Hari Tersisa' : 'Tidak ada target mendesak'}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Pipeline Tahap Aktif</span>
              <span className="w-7 h-7 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
              </span>
            </div>
            <div className="mt-space-sm">
              <div className="font-metric-display text-metric-display text-on-surface leading-none font-bold">{activeAndPrep.length} Arena</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Active / Preparing
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Target Pool Ekuitas</span>
              <span className="w-7 h-7 rounded-lg bg-primary-container/30 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">payments</span>
              </span>
            </div>
            <div className="mt-space-sm">
              <div className="font-metric-display text-[24px] text-secondary leading-none font-bold">
                {formatRupiah(targetPoolTotal)}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Total Potensi Dana Hibah & Prize
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Audit Submisi Terdekat</span>
              <span className="w-7 h-7 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </span>
            </div>
            <div className="mt-space-sm">
              <div className="font-metric-display text-[32px] text-primary leading-none font-bold">{auditSubmisiText}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                {auditSubmisiSub}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Filter Tabs */}
        <div className="flex items-center justify-between gap-space-md overflow-x-auto pb-1 mt-4">
          <div className="flex items-center gap-space-xs flex-nowrap">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-space-md py-space-xs rounded-lg font-label-sm text-label-sm uppercase tracking-wider font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Competitions Cards Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-space-md mt-2">
          {filtered.map(comp => (
            <div key={comp.id} className={`bg-surface-container-low rounded-xl p-space-lg flex flex-col justify-between relative shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border ${comp.deadlineValue.includes('hari lagi') && parseInt(comp.deadlineValue) <= 3 && comp.category !== 'finished' ? 'border-tertiary/50 shadow-[0_0_12px_rgba(255,180,171,0.2)]' : 'border-transparent'}`}>
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold flex items-center gap-1.5">
                      {comp.division}
                    </span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight mt-0.5">
                      {comp.title}
                    </h3>
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-medium mt-1 text-primary">{formatRupiah(comp.prizePool)} Prize Pool</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-wider flex items-center gap-1 ${comp.badgeClass}`}>
                      {comp.isPulsing && <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>}
                      {comp.badgeText === 'Finished' && <span className="material-symbols-outlined text-[14px]">workspace_premium</span>}
                      {comp.badgeText}
                    </span>
                    <button onClick={() => handleDelete(comp.id)} className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-highest text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
                
                <div className={`bg-surface-container-lowest p-space-sm rounded-lg flex flex-col gap-space-xs mt-2`}>
                  <div className="flex justify-between items-center text-label-sm font-label-sm">
                    <span className="text-outline uppercase">{comp.registrationOrStatusText}</span>
                    <span className="text-on-surface font-semibold">{comp.registrationOrStatusValue}</span>
                  </div>
                  <div className="flex justify-between items-center text-label-sm font-label-sm">
                    <span className="text-outline uppercase">{comp.deadlineText}</span>
                    <span className={comp.deadlineValue.includes('Besok') || comp.deadlineValue.includes('hari lagi') || comp.category === 'wishlist' ? (comp.category === 'wishlist' ? 'text-tertiary font-bold' : (comp.deadlineValue.includes('Besok') || (parseInt(comp.deadlineValue) && parseInt(comp.deadlineValue) <= 3) ? 'text-tertiary font-bold' : 'text-secondary font-bold')) : 'text-on-surface font-semibold'}>
                      {comp.deadlineValue}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-space-xs mt-3">
                  <div className="flex justify-between items-center font-label-sm text-label-sm">
                    <span className="text-outline uppercase tracking-wider">{comp.progressLabel}</span>
                    <span className={`${comp.category === 'wishlist' ? 'text-outline font-bold' : (comp.category === 'preparing' && comp.progressPercent < 20 ? 'text-primary font-bold' : (comp.progressPercent === 100 ? 'text-secondary font-bold' : (comp.category === 'active' ? 'text-primary font-bold' : 'text-secondary font-bold')))}`}>
                      {comp.progressPercent}% {comp.category === 'finished' ? 'Selesai' : ''}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${comp.progressColorClass}`} style={{ width: `${comp.progressPercent}%` }}></div>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm uppercase font-semibold text-outline">Persyaratan Submisi</span>
                  {comp.checklist.length > 0 ? (
                    <div className="space-y-2">
                      {comp.checklist.map(chk => (
                        <div key={chk.id} onClick={() => toggleChecklist(comp.id, chk.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${chk.isChecked ? 'bg-surface-container-lowest' : 'bg-surface-container-high/50 hover:bg-surface-container-high'}`}>
                          <span className={`material-symbols-outlined text-[18px] ${chk.isChecked ? 'text-secondary' : 'text-outline'}`}>
                            {chk.isChecked ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className={`font-body-sm text-body-sm ${chk.isChecked ? 'text-outline line-through' : 'text-on-surface'}`}>{chk.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-outline italic">No checklist items</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && !isLoading && (
            <div className="lg:col-span-3 py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-lowest rounded-xl">
              <span className="material-symbols-outlined text-outline text-[48px]">trophy</span>
              <p className="font-body-md text-outline">Tidak ada kompetisi di kategori ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="font-headline-md text-on-surface font-bold mb-4">Tambah Kompetisi / Hackathon Baru</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Nama Kompetisi / Hackathon</label>
                  <input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. Gemastik 2026 - Data Mining" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Kategori / Track</label>
                  <input 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. UI/UX, AI/ML..." 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Deadline Submisi</label>
                  <input 
                    type="date"
                    value={form.deadline} 
                    onChange={e => setForm({...form, deadline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tahap Pipeline</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                  >
                    <option value="active">Active Focus</option>
                    <option value="preparing">Preparing</option>
                    <option value="submitted">Submitted</option>
                    <option value="wishlist">Wishlist</option>
                    <option value="finished">Finished / Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Prize Pool (IDR)</label>
                  <input 
                    type="number"
                    value={form.prizePool || ''} 
                    onChange={e => setForm({...form, prizePool: Number(e.target.value)})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. 10000000" 
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-label-sm text-outline uppercase tracking-wider font-semibold">Persyaratan Submisi / Checklist</label>
                  <button onClick={() => setForm(p => ({...p, checklist: [...p.checklist, {id: Date.now().toString(), title: '', isChecked: false}]}))} className="text-primary font-label-sm text-label-sm font-semibold hover:text-primary-fixed">+ Tambah Dokumen</button>
                </div>
                <div className="space-y-2">
                  {form.checklist.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-container-highest text-outline flex items-center justify-center font-label-sm flex-shrink-0">{idx + 1}</div>
                      <input 
                        value={m.title}
                        onChange={e => {
                          const newM = [...form.checklist];
                          newM[idx].title = e.target.value;
                          setForm({...form, checklist: newM});
                        }}
                        className="flex-1 bg-surface-container text-on-surface px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                        placeholder="Mis. Pitch Deck PDF"
                      />
                      <button onClick={() => {
                        const newM = [...form.checklist];
                        newM.splice(idx, 1);
                        setForm({...form, checklist: newM});
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
              <button onClick={handleCreateSubmit} className="px-5 py-2.5 rounded-xl font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span> Simpan Kompetisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competitions;
