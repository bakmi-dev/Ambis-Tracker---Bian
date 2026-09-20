import { useState, useEffect } from 'react';
import { projectApi } from '../api';

interface Project {
  id: string;
  status: 'Planning' | 'Development' | 'Completed' | 'Archived';
  title: string;
  description: string;
  badgeText: string;
  badgeClass: string;
  badgeIcon?: string;
  subBadgeText: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  progressPercent: number;
  logoUrl?: string;
  category: string;
  prdUrl?: string;
  designUrl?: string;
  repoUrl?: string;
  demoUrl?: string;
  progressText: string;
  progressColorClass: string;
  opacityClass?: string;
  createdAt: Date;
  updatedAt: Date;
}

const getPriorityWeight = (p: string) => {
  if (p === 'HIGH') return 3;
  if (p === 'MEDIUM') return 2;
  if (p === 'LOW') return 1;
  return 0;
};

const mapBackendToFrontend = (bp: any): Project => {
  let status: Project['status'] = bp.status || 'Planning';
  // Map old statuses to new statuses if needed
  if (status.toLowerCase() === 'active' || status.toLowerCase() === 'development') status = 'Development';
  else if (status.toLowerCase() === 'todo') status = 'Planning';
  else if (status.toLowerCase() === 'planning') status = 'Planning';
  else if (status.toLowerCase() === 'completed') status = 'Completed';
  else if (status.toLowerCase() === 'archived') status = 'Archived';

  let badgeText = 'PLANNING';
  let badgeClass = 'bg-surface-container-high text-on-surface-variant';
  let badgeIcon = 'draw';
  let progressColorClass = 'bg-primary';

  if (status === 'Development') {
    badgeText = 'ACTIVE DEV';
    badgeClass = 'bg-primary-container text-primary';
    badgeIcon = 'terminal';
    progressColorClass = 'bg-primary';
  } else if (status === 'Completed') {
    badgeText = 'COMPLETED';
    badgeClass = 'bg-secondary-container/50 text-secondary';
    badgeIcon = 'verified';
    progressColorClass = 'bg-secondary';
  } else if (status === 'Archived') {
    badgeText = 'ARCHIVED';
    badgeClass = 'bg-surface-container text-outline';
    badgeIcon = 'inventory_2';
    progressColorClass = 'bg-surface-container-highest';
  }


  return {
    id: bp.id,
    status,
    title: bp.title,
    description: bp.description || '',
    badgeText,
    badgeClass,
    badgeIcon,
    subBadgeText: `${bp.priority || 'MEDIUM'} Priority`,
    priority: bp.priority || 'MEDIUM',
    progressPercent: bp.progress_percent || 0,
    logoUrl: bp.logo_url || '',
    category: bp.category || 'Engineering',
    prdUrl: bp.prd_url || '',
    designUrl: bp.design_url || '',
    repoUrl: bp.repo_url || '',
    demoUrl: bp.demo_url || '',
    progressText: status === 'Completed' ? '100% Completed' : `${bp.progress_percent || 0}% Progress`,
    progressColorClass,
    createdAt: new Date(bp.created_at),
    updatedAt: new Date(bp.updated_at),
    opacityClass: status === 'Archived' ? 'opacity-70 grayscale-[30%]' : ''
  };
};

const Projects = () => {
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [sortOption, setSortOption] = useState('priority');
  
  const statusTabs = [
    { id: 'all', label: 'Semua Project' },
    { id: 'Development', label: 'Development' },
    { id: 'Planning', label: 'Planning' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Archived', label: 'Archived' }
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
    status: 'Planning',
    priority: 'MEDIUM',
    progressPercent: 0,
    logoUrl: '',
    category: 'Engineering',
    prdUrl: '',
    designUrl: '',
    repoUrl: '',
    demoUrl: ''
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
      status: 'Planning',
      priority: 'MEDIUM',
      progressPercent: 0,
      logoUrl: '',
      category: 'Engineering',
      prdUrl: '',
      designUrl: '',
      repoUrl: '',
      demoUrl: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingId(proj.id);
    setForm({
      title: proj.title,
      description: proj.description,
      status: proj.status,
      priority: proj.priority,
      progressPercent: proj.progressPercent,
      logoUrl: proj.logoUrl || '',
      category: proj.category,
      prdUrl: proj.prdUrl || '',
      designUrl: proj.designUrl || '',
      repoUrl: proj.repoUrl || '',
      demoUrl: proj.demoUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setIsLoading(true);
    try {
      const data = {
        title: form.title,
        status: form.status,
        description: form.description,
        priority: form.priority,
        progress_percent: form.progressPercent,
        logo_url: form.logoUrl,
        category: form.category,
        prd_url: form.prdUrl,
        design_url: form.designUrl,
        repo_url: form.repoUrl,
        demo_url: form.demoUrl,
      };

      if (editingId) {
        await projectApi.update(editingId, data);
      } else {
        await projectApi.create(data);
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
  const activeDevCount = projects.filter(p => p.status === 'Development').length;
  const gitLinkedCount = projects.filter(p => p.repoUrl && p.repoUrl.trim().length > 0).length;
  const prodCount = projects.filter(p => p.status === 'Completed').length;

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
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-on-surface-variant animate-pulse">Memuat project...</p>
          </div>
        </div>
      )}

      {/* Top Hero Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span>COMMAND DECK</span>
            <span className="text-outline/40">/</span>
            <span>REPOSITORIES & ENGINEERING</span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-bold">ACTIVE REPOS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface font-sans">
            Projects & Engineering Builds
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed font-sans">
            Manajemen arsitektur kode, sprint pengembangan fitur, repositori aktif, dan portofolio teknologi berbobot tinggi.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <button 
            onClick={handleSync} 
            className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-2 text-xs sm:text-sm font-medium border border-neutral-800/50 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-tertiary animate-ping' : 'bg-secondary'}`}></span>
            <span>{isSyncing ? 'Syncing...' : (syncDone ? 'Sync OK' : 'Git Sync')}</span>
          </button>
          
          <div className="relative inline-flex">
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)} 
              className="px-4 py-2.5 pl-9 pr-8 rounded-xl bg-surface-container-low border border-neutral-800/50 text-on-surface text-xs sm:text-sm font-medium hover:bg-surface-container transition-colors appearance-none cursor-pointer outline-none"
            >
              <option value="priority">Prioritas Tertinggi</option>
              <option value="date">Tanggal Terkini</option>
              <option value="name">Nama A-Z</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">sort</span>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">expand_more</span>
          </div>

          <button 
            onClick={openCreateModal} 
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Buat Project Baru</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Aktif Sesi Ini</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{activeDevCount}</span>
            <span className="text-xs text-secondary font-semibold">Proyek Berjalan</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Development Status</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Git Linked</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{gitLinkedCount}</span>
            <span className="text-xs text-primary font-semibold">Repositori</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className={`material-symbols-outlined text-[14px] ${gitLinkedCount > 0 ? 'text-primary' : 'text-outline'}`}>{gitLinkedCount > 0 ? 'sync' : 'sync_disabled'}</span>
            <span>{gitLinkedCount > 0 ? 'URL Disinkronisasi' : 'Belum ada koneksi'}</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Commit Velocity</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">commit</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">14</span>
            <span className="text-xs text-tertiary font-semibold">Pekan Ini</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className="material-symbols-outlined text-[14px] text-tertiary">trending_up</span>
            <span>+12% vs minggu lalu</span>
          </div>
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Production Deploy</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{prodCount}</span>
            <span className="text-xs text-secondary font-semibold">Live Ready</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-normal">
            <span className={`w-1.5 h-1.5 rounded-full ${prodCount > 0 ? 'bg-secondary' : 'bg-outline'}`}></span>
            <span>Completed Status</span>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-2">
          {statusTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                activeStatusTab === tab.id 
                  ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-outline flex-shrink-0 font-mono">
          <span className="material-symbols-outlined text-[16px]">hub</span>
          <span>Workspace: Production Cluster Alpha</span>
        </div>
      </div>

      {/* SECTION HEADER: ALL REPOSITORIES / PROJECTS GRID */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-outline font-semibold">Projects Catalog</span>
          <span className="px-2 py-0.5 rounded bg-surface-container text-xs text-on-surface-variant font-medium">{filtered.length} Repositories</span>
        </div>
      </div>

      {/* PROJECT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
        {filtered.map(project => (
          <div key={project.id} className={`flex flex-col justify-between bg-surface-container-low hover:bg-surface-container p-5 sm:p-6 rounded-2xl border border-neutral-800/50 hover:border-neutral-700/60 transition-all duration-200 group relative overflow-hidden ${project.opacityClass || ''}`}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {project.logoUrl ? (
                    <img src={project.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-surface-container p-1 border border-neutral-800/50" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant border border-neutral-800/50">
                      <span className="material-symbols-outlined text-[20px]">folder_special</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${project.badgeClass} w-fit`}>
                      {project.badgeIcon && <span className="material-symbols-outlined text-[14px]">{project.badgeIcon}</span>}
                      <span>{project.badgeText}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider w-fit ${project.priority === 'HIGH' ? 'bg-error-container/20 text-error' : (project.priority === 'MEDIUM' ? 'text-tertiary bg-tertiary-container/20' : 'text-outline bg-surface-container')}`}>{project.subBadgeText}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEditModal(project)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-primary transition-colors" title="Edit Project">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-error transition-colors" title="Hapus Project">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight font-sans">
                  {project.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-on-surface-variant line-clamp-3 font-normal leading-relaxed">
                  {project.description}
                </p>
              </div>
              
              {/* Tech tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {project.techTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant font-mono border border-neutral-800/40">
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Links */}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-neutral-800/40">
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 transition-colors text-xs font-semibold text-on-surface cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">code</span> Repo
                  </a>
                )}
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 transition-colors text-xs font-semibold text-on-surface cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span> Live Demo
                  </a>
                )}
                {project.prdUrl && (
                  <a href={project.prdUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 transition-colors text-xs font-semibold text-on-surface cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">description</span> PRD
                  </a>
                )}
                {project.designUrl && (
                  <a href={project.designUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 transition-colors text-xs font-semibold text-on-surface cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">design_services</span> Design
                  </a>
                )}
                )}
              </div>
            </div>
            
            {/* Footer Info */}
            <div className="mt-4 pt-3 space-y-2 border-t border-neutral-800/40">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={`${project.status === 'Completed' ? 'text-secondary font-semibold' : 'text-on-surface-variant'} flex items-center gap-1`}>
                  <span className="material-symbols-outlined text-[14px]">update</span>
                  <span>Diperbarui {project.updatedAt ? project.updatedAt.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : ''}</span>
                </span>
                {project.progressPercent > 0 && <span className={`${project.progressColorClass.replace('bg-', 'text-')} font-bold font-sans`}>{project.progressText}</span>}
                {project.progressPercent === 0 && project.status === 'Archived' && <span className="text-outline font-bold font-sans">{project.progressText}</span>}
              </div>
              {project.progressPercent > 0 && (
                <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${project.progressColorClass}`} style={{ width: `${project.progressPercent}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && !isLoading && (
          <div className="md:col-span-2 xl:col-span-3 py-12 text-center flex flex-col items-center gap-2 bg-surface-container/30 border border-neutral-800/50 rounded-2xl">
            <span className="material-symbols-outlined text-outline/60 text-[36px]">terminal</span>
            <p className="text-xs text-outline font-medium">Tidak ada project di kriteria ini.</p>
          </div>
        )}
      </div>

      {/* Sync Github Banner */}
      <section className="rounded-2xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-secondary flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">sync_alt</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-secondary font-bold tracking-widest uppercase">Git Synchronization Engine</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight font-sans">
              Sinkronisasi GitHub Repositories
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant font-normal leading-relaxed font-sans">
              Auto-fetch pull requests, status CI/CD checks, commit hashes, dan update progress story points secara real-time.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0">
          <button 
            onClick={handleSync} 
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-neutral-800/50 text-secondary text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-none"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin text-tertiary' : ''}`}>{syncDone ? 'check' : 'refresh'}</span>
            <span className={syncDone ? 'text-secondary font-bold' : ''}>{isSyncing ? 'Menyinkronkan...' : (syncDone ? 'Berhasil Disinkronkan!' : 'Sinkronkan Sekarang')}</span>
          </button>
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] border border-neutral-800/50">
            <h2 className="text-xl font-bold text-on-surface mb-4 font-sans">{editingId ? 'Edit Project' : 'Buat Project Baru'}</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Nama Proyek / Repositori</label>
                  <input 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. Raft Consensus Node" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Deskripsi / Ringkasan Arsitektur</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none" 
                    rows={3} 
                    placeholder="Deskripsi teknis singkat..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Status Proyek</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({...form, status: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Planning">Planning (Akan Dibangun)</option>
                    <option value="Development">Development (Sedang Berjalan)</option>
                    <option value="Completed">Completed (Selesai/Live)</option>
                    <option value="Archived">Archived (Diarsipkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Prioritas</label>
                  <select 
                    value={form.priority} 
                    onChange={e => setForm({...form, priority: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Tech Stack / Tags</label>
                  <input 
                    value={form.techTagsStr} 
                    onChange={e => setForm({...form, techTagsStr: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Pisahkan dengan koma" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Kategori</label>
                  <input 
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="Mis. Engineering" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5 flex items-center justify-between">
                    <span>Progress</span>
                    <span className="text-primary font-bold">{form.progressPercent}%</span>
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={form.progressPercent} 
                    onChange={e => setForm({...form, progressPercent: Number(e.target.value)})} 
                    className="w-full accent-primary cursor-pointer" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Logo URL (PNG / SVG)</label>
                  <div className="flex items-center gap-3">
                    {form.logoUrl && (
                      <img src={form.logoUrl} alt="Logo Preview" className="w-10 h-10 rounded-lg bg-surface-container-high object-contain p-1 border border-surface-container-highest" />
                    )}
                    <input 
                      value={form.logoUrl} 
                      onChange={e => setForm({...form, logoUrl: e.target.value})} 
                      className="flex-1 bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                      placeholder="https://.../logo.png" 
                    />
                  </div>

                  </div>

                <div className="md:col-span-2 mt-4 pt-4 border-t border-surface-container-highest">
                  <h3 className="font-label-md text-on-surface font-bold uppercase tracking-widest mb-3">Artefak Dokumentasi (Opsional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Link PRD / Dokumen</label>
                      <input 
                        value={form.prdUrl} 
                        onChange={e => setForm({...form, prdUrl: e.target.value})} 
                        className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                        placeholder="https://docs.google.com/..." 
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Link UI/UX (Figma)</label>
                      <input 
                        value={form.designUrl} 
                        onChange={e => setForm({...form, designUrl: e.target.value})} 
                        className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                        placeholder="https://figma.com/..." 
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Link Repositori</label>
                      <input 
                        value={form.repoUrl} 
                        onChange={e => setForm({...form, repoUrl: e.target.value})} 
                        className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                        placeholder="https://github.com/..." 
                      />
                    </div>
                    <div>
                      <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Link Demo / Live</label>
                      <input 
                        value={form.demoUrl} 
                        onChange={e => setForm({...form, demoUrl: e.target.value})} 
                        className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                        placeholder="https://...vercel.app" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-neutral-800/50">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors border border-purple-500/30 flex items-center gap-2 shadow-none cursor-pointer">
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
