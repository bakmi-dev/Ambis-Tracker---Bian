import { useState, useEffect } from 'react';
import { projectApi } from '../api';

interface Project {
  id: string;
  status: 'development' | 'planning' | 'completed' | 'archived';
  title: string;
  description: string;
  badgeText: string;
  badgeClass: string;
  badgeIcon?: string;
  subBadgeText: string;
  techTags: string[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  gitUrl: string;
  relatedGoal: string;
  relatedGoalIcon: string;
  relatedGoalClass: string;
  footerDateIcon?: string;
  footerDateText?: string;
  progressPercent: number;
  progressText: string;
  progressColorClass: string;
  opacityClass?: string;
  createdAt: Date;
}

const getPriorityWeight = (p: string) => {
  if (p === 'Critical') return 4;
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  return 1;
};

const mapBackendToFrontend = (bp: any): Project => {
  let status: Project['status'] = 'planning';
  if (bp.status === 'active' || bp.status === 'development') status = 'development';
  else if (bp.status === 'completed') status = 'completed';
  else if (bp.status === 'archived') status = 'archived';

  let badgeText = 'PLANNING';
  let badgeClass = 'bg-surface-container-high text-on-surface-variant';
  let badgeIcon = 'draw';
  let progressColorClass = 'bg-primary';

  if (status === 'development') {
    badgeText = 'ACTIVE DEV';
    badgeClass = 'bg-primary-container text-primary';
    badgeIcon = 'terminal';
    progressColorClass = 'bg-primary';
  } else if (status === 'completed') {
    badgeText = 'COMPLETED';
    badgeClass = 'bg-secondary-container/50 text-secondary';
    badgeIcon = 'verified';
    progressColorClass = 'bg-secondary';
  } else if (status === 'archived') {
    badgeText = 'ARCHIVED';
    badgeClass = 'bg-surface-container text-outline';
    badgeIcon = 'inventory_2';
    progressColorClass = 'bg-surface-container-highest';
  }

  // Parse JSON from description
  let descriptionText = bp.description || 'No description provided.';
  let techTags: string[] = [];
  let priority: Project['priority'] = 'Medium';
  let gitUrl = '';

  try {
    const parsed = JSON.parse(bp.description || '{}');
    if (parsed && parsed.isJSONProjectDesc) {
      descriptionText = parsed.realDescription || '';
      techTags = parsed.techTags || [];
      priority = parsed.priority || 'Medium';
      gitUrl = parsed.gitUrl || '';
    }
  } catch (e) {
    // String only
  }

  return {
    id: bp.id,
    status,
    title: bp.title,
    description: descriptionText,
    badgeText,
    badgeClass,
    badgeIcon,
    subBadgeText: priority + ' Priority',
    techTags,
    priority,
    gitUrl,
    relatedGoal: 'General Engineering',
    relatedGoalIcon: 'track_changes',
    relatedGoalClass: 'text-primary',
    footerDateIcon: 'update',
    footerDateText: `Updated ${new Date(bp.updated_at).toLocaleDateString()}`,
    progressPercent: bp.progress || 0,
    progressText: status === 'completed' ? '100% Completed' : `${bp.progress || 0}% Progress`,
    progressColorClass,
    opacityClass: status === 'archived' ? 'opacity-70' : '',
    createdAt: new Date(bp.created_at)
  };
};

const Projects = () => {
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [sortOption, setSortOption] = useState('priority');
  
  const statusTabs = [
    { id: 'all', label: 'Semua Project' },
    { id: 'development', label: 'Development' },
    { id: 'planning', label: 'Planning' },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archived' }
  ];

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'development',
    techTagsStr: '',
    priority: 'Medium',
    gitUrl: ''
  });

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await projectApi.getAll();
      setProjects(res.data.map(mapBackendToFrontend));
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      status: 'development',
      techTagsStr: '',
      priority: 'Medium',
      gitUrl: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingId(proj.id);
    setForm({
      title: proj.title,
      description: proj.description,
      status: proj.status,
      techTagsStr: proj.techTags.join(', '),
      priority: proj.priority,
      gitUrl: proj.gitUrl
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setIsLoading(true);
    
    const techArray = form.techTagsStr.split(',').map(s => s.trim()).filter(s => s);
    const payloadDesc = JSON.stringify({
      isJSONProjectDesc: true,
      realDescription: form.description,
      techTags: techArray,
      priority: form.priority,
      gitUrl: form.gitUrl
    });

    try {
      if (editingId) {
        await projectApi.update(editingId, {
          title: form.title,
          status: form.status,
          description: payloadDesc,
          progress: form.status === 'completed' ? 100 : undefined
        });
      } else {
        await projectApi.create({
          title: form.title,
          status: form.status,
          description: payloadDesc
        });
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus proyek ini secara permanen?')) return;
    try {
      await projectApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    }, 2000);
  };

  // Metrics
  const activeDevCount = projects.filter(p => p.status === 'development').length;
  const gitLinkedCount = projects.filter(p => p.gitUrl && p.gitUrl.trim().length > 0).length;
  const prodCount = projects.filter(p => p.status === 'completed').length;

  // Filter & Sort
  let filtered = activeStatusTab === 'all' ? projects : projects.filter(p => p.status === activeStatusTab);
  filtered = [...filtered].sort((a, b) => {
    if (sortOption === 'priority') {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    } else if (sortOption === 'date') {
      return b.createdAt.getTime() - a.createdAt.getTime();
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
            <p className="font-body-md text-on-surface-variant animate-pulse">Memuat project...</p>
          </div>
        </div>
      )}
      {/* Top Hero Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg pb-space-lg">
        <div className="space-y-space-xs max-w-3xl">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm tracking-wider uppercase text-secondary">
            <span>Command Deck</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Repositories & Engineering</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Active Repos</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
            Projects & Engineering Builds
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manajemen arsitektur kode, sprint pengembangan fitur, repositori aktif, dan portofolio teknologi berbobot tinggi.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button onClick={handleSync} className="px-space-md py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface flex items-center gap-space-xs font-label-md text-label-md transition-all">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-tertiary animate-ping' : 'bg-secondary shadow-[0_0_8px_rgba(76,215,246,0.8)]'}`}></span>
            <span>{isSyncing ? 'Syncing...' : (syncDone ? 'Sync OK' : 'Git Sync')}</span>
          </button>
          
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-2.5 rounded-xl border border-surface-container-highest relative cursor-pointer">
            <span className="material-symbols-outlined text-outline text-[18px]">sort</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase pointer-events-none">Urutkan:</span>
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)} 
              className="bg-transparent font-label-sm text-label-sm text-secondary font-semibold appearance-none outline-none cursor-pointer pr-4"
            >
              <option value="priority">Prioritas Tertinggi</option>
              <option value="date">Tanggal Terkini</option>
              <option value="name">Nama A-Z</option>
            </select>
          </div>

          <button onClick={openCreateModal} className="px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-fixed text-on-primary font-label-md text-label-md font-semibold flex items-center gap-space-xs shadow-[0_0_24px_-2px_rgba(208,188,255,0.4)] transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>+ Buat Project Baru</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mb-space-lg">
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Aktif Sesi Ini</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
            </div>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">{activeDevCount}</span>
            <span className="font-label-sm text-label-sm text-secondary">Proyek Berjalan</span>
          </div>
          <div className="mt-space-xs flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Development Status</span>
          </div>
        </div>
        
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Git Linked</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">terminal</span>
            </div>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">{gitLinkedCount}</span>
            <span className="font-label-sm text-label-sm text-primary">Repositori</span>
          </div>
          <div className="mt-space-xs flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className={`material-symbols-outlined text-[12px] ${gitLinkedCount > 0 ? 'text-primary' : 'text-outline'}`}>{gitLinkedCount > 0 ? 'sync' : 'sync_disabled'}</span>
            <span>{gitLinkedCount > 0 ? 'URL Disinkronisasi' : 'Belum ada koneksi'}</span>
          </div>
        </div>
        
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Commit Velocity</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-high text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">commit</span>
            </div>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">14</span>
            <span className="font-label-sm text-label-sm text-tertiary">Pekan Ini</span>
          </div>
          <div className="mt-space-xs flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px] text-tertiary">trending_up</span>
            <span>+12% vs minggu lalu</span>
          </div>
        </div>
        
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Production Deploy</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">verified</span>
            </div>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display font-bold text-on-surface">{prodCount}</span>
            <span className="font-label-sm text-label-sm text-secondary">Live Ready</span>
          </div>
          <div className="mt-space-xs flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className={`w-1.5 h-1.5 rounded-full ${prodCount > 0 ? 'bg-secondary' : 'bg-outline'}`}></span>
            <span>Completed Status</span>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center justify-between gap-space-md overflow-x-auto pb-space-sm mb-space-lg">
        <div className="flex items-center gap-space-xs bg-surface-container-lowest p-1 rounded-xl">
          {statusTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                activeStatusTab === tab.id 
                  ? 'bg-surface-container text-on-surface font-semibold shadow-sm' 
                  : 'hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline flex-shrink-0">
          <span className="material-symbols-outlined text-[16px]">hub</span>
          <span>Workspace: Production Cluster Alpha</span>
        </div>
      </div>

      {/* SECTION HEADER: ALL REPOSITORIES / PROJECTS GRID */}
      <div className="flex items-center justify-between pb-space-sm mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Projects Catalog</span>
          <span className="px-space-xs py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-on-surface-variant">{filtered.length} Repositories Shown</span>
        </div>
      </div>

      {/* PROJECT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg mb-space-xl">
        {filtered.map(project => (
          <div key={project.id} className={`flex flex-col justify-between bg-surface-container-low hover:bg-surface-container p-space-lg rounded-2xl transition-all group shadow-sm hover:-translate-y-0.5 hover:shadow-md ${project.opacityClass || ''}`}>
            <div className="space-y-space-sm">
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className={`px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold tracking-wide uppercase flex items-center gap-1 ${project.badgeClass}`}>
                    {project.badgeIcon && <span className="material-symbols-outlined text-[14px]">{project.badgeIcon}</span>}
                    <span>{project.badgeText}</span>
                  </span>
                  <span className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${project.priority === 'Critical' ? 'bg-error-container/20 text-error' : (project.priority === 'High' ? 'text-tertiary' : 'text-outline')}`}>{project.subBadgeText}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(project)} className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                  {project.description}
                </p>
              </div>
              
              {/* Tech tags */}
              <div className="flex flex-wrap gap-1.5 pt-space-xs">
                {project.techTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Goal Relation & Git Link */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-space-sm rounded-lg bg-surface-container flex items-center gap-space-xs overflow-hidden">
                  <span className={`material-symbols-outlined text-[16px] ${project.relatedGoalClass}`}>{project.relatedGoalIcon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-label-sm text-label-sm text-outline block uppercase text-[10px]">Related</span>
                    <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate block">Engineering</span>
                  </div>
                </div>
                
                {project.gitUrl ? (
                  <a href={project.gitUrl} target="_blank" rel="noreferrer" className="p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-highest transition-colors flex items-center gap-space-xs overflow-hidden group/link">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover/link:text-primary">link</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-label-sm text-label-sm text-outline block uppercase text-[10px]">Repository</span>
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate block group-hover/link:text-primary transition-colors">{project.gitUrl.replace('https://github.com/', '')}</span>
                    </div>
                  </a>
                ) : (
                  <div className="p-space-sm rounded-lg bg-surface-container flex items-center gap-space-xs overflow-hidden opacity-50">
                    <span className="material-symbols-outlined text-[16px] text-outline">link_off</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-label-sm text-label-sm text-outline block uppercase text-[10px]">Repository</span>
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface truncate block">No Link</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer Info */}
            <div className="mt-space-md pt-space-sm space-y-space-xs border-t border-surface-container-highest/50">
              <div className="flex items-center justify-between font-label-sm text-label-sm">
                <span className={`${project.status === 'completed' ? 'text-secondary font-semibold' : 'text-on-surface-variant'} flex items-center gap-1`}>
                  {project.footerDateIcon && <span className="material-symbols-outlined text-[14px]">{project.footerDateIcon}</span>}
                  <span>{project.footerDateText}</span>
                </span>
                {project.progressPercent > 0 && <span className={`${project.progressColorClass.replace('bg-', 'text-')} font-bold`}>{project.progressText}</span>}
                {project.progressPercent === 0 && project.status === 'archived' && <span className="text-outline font-bold">{project.progressText}</span>}
              </div>
              {project.progressPercent > 0 && (
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${project.progressColorClass}`} style={{ width: `${project.progressPercent}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && !isLoading && (
          <div className="md:col-span-2 xl:col-span-3 py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-lowest rounded-xl">
            <span className="material-symbols-outlined text-outline text-[48px]">terminal</span>
            <p className="font-body-md text-outline">Tidak ada project di kriteria ini.</p>
          </div>
        )}
      </div>

      {/* Sync Github Banner */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[24px]">sync_alt</span>
          </div>
          <div>
            <h4 className="font-body-md text-body-md font-bold text-on-surface">Sinkronisasi GitHub Repositories</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Auto-fetch pull requests, status CI/CD checks, commit hashes, dan update progress story points secara real-time.
            </p>
          </div>
        </div>
        <button onClick={handleSync} className={`px-space-md py-space-sm rounded-lg text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-space-xs whitespace-nowrap ${isSyncing ? 'bg-surface-container-high' : 'bg-surface-container-high hover:bg-surface-container'}`}>
          <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin text-tertiary' : ''}`}>{syncDone ? 'check' : 'refresh'}</span>
          <span className={syncDone ? 'text-secondary font-bold' : ''}>{isSyncing ? 'Menyinkronkan...' : (syncDone ? 'Berhasil Disinkronkan!' : 'Sinkronkan Sekarang')}</span>
        </button>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="font-headline-md text-on-surface font-bold mb-4">{editingId ? 'Edit Project' : 'Buat Project Baru'}</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Nama Proyek / Repositori</label>
                  <input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. Raft Consensus Node" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Deskripsi / Ringkasan Arsitektur</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-surface-container-highest" 
                    rows={3} 
                    placeholder="Deskripsi teknis singkat..."
                  ></textarea>
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Status Proyek</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                  >
                    <option value="planning">Planning (Akan Dibangun)</option>
                    <option value="development">Development (Sedang Berjalan)</option>
                    <option value="completed">Completed (Selesai/Live)</option>
                    <option value="archived">Archived (Diarsipkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Prioritas</label>
                  <select 
                    value={form.priority} 
                    onChange={e => setForm({...form, priority: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tech Stack / Tags (Pisahkan dengan koma)</label>
                  <input 
                    value={form.techTagsStr} 
                    onChange={e => setForm({...form, techTagsStr: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="Mis. React, Node.js, Go, PostgreSQL" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Link Repository / Demo URL (Opsional)</label>
                  <input 
                    value={form.gitUrl} 
                    onChange={e => setForm({...form, gitUrl: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="https://github.com/..." 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-container-highest">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold">Batal</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-xl font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span> Simpan Project
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Projects;
