import { useState, useEffect } from 'react';
import { analyticsApi, learningApi, projectApi, competitionApi, profileApi, taskApi, studySessionApi } from '../api';
import Avatar from '../components/common/Avatar';
import { useGlobalState } from '../context/GlobalContext';

interface ProfileData {
  name: string;
  tagline: string;
  bio: string;
  location: string;
  role: string;
  github: string;
  linkedin: string;
  portfolio: string;
  avatarUrl: string;
}

const Progress = () => {
  const { user, setUser } = useGlobalState();
  const [metrics, setMetrics] = useState({
    xp: 0,
    streak: 0,
    studyMinutes: 0,
    tasksCompleted: 0,
    learningPaths: 0,
    projectsAndComps: 0
  });

  const currentProfile = {
    name: user?.name || 'Operator',
    tagline: user?.role_track || 'Cognitive Architect',
    bio: user?.bio || 'Membangun disiplin kognitif, menguasai sistem terdistribusi, dan konsisten belajar setiap hari tanpa distraksi.',
    location: user?.location || 'Global Workspace',
    role: user?.role_track || 'CS Undergraduate',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
    portfolio: user?.website || '',
    avatarUrl: user?.avatar_url || ''
  };

  const [isLoading, setIsLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form, setForm] = useState<ProfileData>(currentProfile);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        const [
          analyticsRes, 
          learningRes, 
          projectRes, 
          compRes, 
          profileRes,
          tasksRes,
          studyRes
        ] = await Promise.all([
          analyticsApi.getSummary(),
          learningApi.getAll(),
          projectApi.getAll(),
          competitionApi.getAll(),
          profileApi.getProfile(),
          taskApi.getAll(),
          studySessionApi.getAll()
        ]);
        
        // Compute metrics from actual data
        const totalFocus = studyRes.data.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0);
        const completedTasks = tasksRes.data.filter((t: any) => t.is_completed).length;
        const activeLearning = learningRes.data.filter((l: any) => l.status === 'in_progress').length;
        
        const activeProjects = projectRes.data.filter((p: any) => p.status === 'development' || p.status === 'active').length;
        const activeComps = compRes.data.filter((c: any) => c.status === 'active' || c.status === 'preparation' || c.status === 'preparing').length;
        
        setMetrics({
          xp: analyticsRes.data.totalXP || 0,
          streak: analyticsRes.data.currentStreak || 0,
          studyMinutes: totalFocus,
          tasksCompleted: completedTasks,
          learningPaths: activeLearning > 0 ? activeLearning : learningRes.data.length || 0,
          projectsAndComps: activeProjects + activeComps
        });

        if (profileRes.user) {
          const u = profileRes.user;
          setUser({
            ...user,
            ...u
          });
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const openEditModal = () => {
    setForm(currentProfile);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const res = await profileApi.updateProfile({
        name: form.name,
        role_track: form.role,
        bio: form.bio,
        github: form.github,
        linkedin: form.linkedin,
        website: form.portfolio,
        location: form.location,
        avatar_url: form.avatarUrl
      });
      if (res.user) {
        setUser({ ...user, ...res.user });
      }
      setIsEditModalOpen(false);

    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const url = currentProfile.portfolio.startsWith('http') ? currentProfile.portfolio : `https://${currentProfile.portfolio}`;
    navigator.clipboard.writeText(url);
    setToastMessage('Link portofolio berhasil disalin!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const level = Math.floor(metrics.xp / 100) + 1;
  const currentLevelXp = metrics.xp % 100;


  return (
    <div className="flex flex-col w-full relative">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="font-body-md text-on-surface-variant animate-pulse">Memuat profil...</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-neutral-800/50 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-2 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="text-sm font-semibold">{toastMessage}</span>
      </div>
      
      <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
        {/* Header & Breadcrumb Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
              <span className="material-symbols-outlined text-[14px]">person</span>
              <span>COMMAND DECK</span>
              <span className="text-outline/40">/</span>
              <span>PERSONAL IDENTITY</span>
              <span className="text-outline/40">/</span>
              <span className="text-primary font-bold">{currentProfile.name}'S PROFILE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface font-sans">
              Personal Profile & Growth Overview
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed font-sans">
              Identitas personal, ringkasan level perkembangan, lencana pencapaian, dan jejak langkah kognitif {currentProfile.name}.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <button 
              onClick={openEditModal} 
              className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs sm:text-sm font-medium border border-neutral-800/50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">edit</span>
              <span>Edit Profil</span>
            </button>
            <button 
              onClick={handleShare} 
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>Bagikan Portofolio</span>
            </button>
          </div>
        </div>

        {/* Personal Identity Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low border border-neutral-800/50 p-5 sm:p-6 shadow-none">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
              {/* Avatar + Status Pill */}
              <div className="relative shrink-0">
                <Avatar src={currentProfile.avatarUrl} name={currentProfile.name} size="xl" />
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold border border-secondary/30 flex items-center gap-0.5">
                  <span>LV</span>
                  <span>{level}</span>
                </div>
              </div>
              
              {/* Bio and Metadata */}
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl text-on-surface font-bold font-sans">{currentProfile.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-xs font-medium tracking-wide border border-neutral-800/40">{currentProfile.tagline}</span>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-normal">
                  {currentProfile.bio}
                </p>
                
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface-variant border border-neutral-800/40">
                    <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                    <span>{currentProfile.location}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface-variant border border-neutral-800/40">
                    <span className="material-symbols-outlined text-[14px] text-primary">school</span>
                    <span>{currentProfile.role}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-secondary font-semibold border border-neutral-800/40">
                    <span className="material-symbols-outlined text-[14px] text-secondary">bolt</span>
                    <span>Level {level} Scholar ({currentLevelXp} / 100 XP)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-tertiary font-semibold border border-neutral-800/40">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">local_fire_department</span>
                    <span>{metrics.streak} Days Continuous Streak</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Links / Socials */}
            <div className="flex lg:flex-col flex-wrap gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              {currentProfile.github ? (
                <a href={`https://github.com/${currentProfile.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-neutral-800/40 transition-colors text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">code</span>
                    <span>GitHub</span>
                  </div>
                  <span className="text-on-surface-variant font-mono">@{currentProfile.github}</span>
                </a>
              ) : (
                <button onClick={openEditModal} className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl border border-dashed border-neutral-700/60 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Tambah GitHub</span>
                  </div>
                </button>
              )}
              {currentProfile.linkedin ? (
                <a href={`https://linkedin.com/in/${currentProfile.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-neutral-800/40 transition-colors text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-secondary transition-colors">work</span>
                    <span>LinkedIn</span>
                  </div>
                  <span className="text-on-surface-variant font-mono">/in/{currentProfile.linkedin}</span>
                </a>
              ) : (
                <button onClick={openEditModal} className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl border border-dashed border-neutral-700/60 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Tambah LinkedIn</span>
                  </div>
                </button>
              )}
              {currentProfile.portfolio ? (
                <a href={currentProfile.portfolio.startsWith('http') ? currentProfile.portfolio : `https://${currentProfile.portfolio}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-neutral-800/40 transition-colors text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-tertiary transition-colors">public</span>
                    <span>Portfolio</span>
                  </div>
                  <span className="text-on-surface-variant font-mono">{currentProfile.portfolio.replace(/^https?:\/\//, '')}</span>
                </a>
              ) : (
                <button onClick={openEditModal} className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl border border-dashed border-neutral-700/60 hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface group text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Tambah Portfolio</span>
                  </div>
                </button>
              )}
            </div>
          </div>
          
          {/* XP Bar Progress Tracker */}
          <div className="mt-5 pt-4 space-y-2 border-t border-neutral-800/40">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-on-surface-variant uppercase tracking-wider font-semibold">Level {level} &rarr; Level {level + 1} Progress</span>
              <span className="text-primary font-bold font-sans">{currentLevelXp}% &bull; {100 - currentLevelXp} XP to Level {level + 1}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary" style={{ width: `${currentLevelXp}%` }}></div>
            </div>
          </div>
        </div>

        {/* Simplified Growth Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">query_stats</span>
              <h3 className="text-lg font-bold text-on-surface tracking-tight font-sans">Growth Metrics</h3>
            </div>
            <span className="text-xs text-outline uppercase tracking-wider font-semibold">Status: Optimal Flow</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs uppercase tracking-wider text-outline font-semibold">Total Fokus</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl text-on-surface font-bold tracking-tight font-sans">{Math.floor(metrics.studyMinutes / 60)} Jam {metrics.studyMinutes % 60}m</div>
                <p className="text-xs text-on-surface-variant mt-1 font-normal">{metrics.studyMinutes > 0 ? 'Waktu intensif terakumulasi' : 'Belum ada deep work'}</p>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs uppercase tracking-wider text-outline font-semibold">Tugas Tuntas</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl text-on-surface font-bold tracking-tight font-sans">{metrics.tasksCompleted} Tugas</div>
                <p className="text-xs text-on-surface-variant mt-1 font-normal">{metrics.tasksCompleted > 0 ? 'Modul & task diselesaikan' : 'Belum ada tugas selesai'}</p>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs uppercase tracking-wider text-outline font-semibold">Jalur Belajar</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl text-on-surface font-bold tracking-tight font-sans">{metrics.learningPaths} Topik</div>
                <p className="text-xs text-on-surface-variant mt-1 font-normal">{metrics.learningPaths > 0 ? 'Materi/Roadmap ditekuni' : 'Belum ada aktivitas'}</p>
              </div>
            </div>
            {/* Metric 4 */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between text-outline">
                <span className="text-xs uppercase tracking-wider text-outline font-semibold">Kompetisi & Proyek</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">military_tech</span>
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl text-on-surface font-bold tracking-tight font-sans">{metrics.projectsAndComps} Target</div>
                <p className="text-xs text-on-surface-variant mt-1 font-normal">{metrics.projectsAndComps > 0 ? 'Aktif dalam pipeline' : 'Belum ada pencapaian'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-6 sm:p-7 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] border border-neutral-800/50">
            <h2 className="text-xl font-bold text-on-surface mb-4 font-sans">Edit Personal Profile</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Nama Lengkap / Display Name</label>
                  <input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Tagline / Title</label>
                  <input 
                    value={form.tagline} 
                    onChange={e => setForm({...form, tagline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Bio Singkat</label>
                  <textarea 
                    value={form.bio} 
                    onChange={e => setForm({...form, bio: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none" 
                    rows={3} 
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Lokasi</label>
                  <input 
                    value={form.location} 
                    onChange={e => setForm({...form, location: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Status Akademik / Role</label>
                  <input 
                    value={form.role} 
                    onChange={e => setForm({...form, role: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">GitHub Username</label>
                  <input 
                    value={form.github} 
                    onChange={e => setForm({...form, github: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">LinkedIn URL Segment</label>
                  <input 
                    value={form.linkedin} 
                    onChange={e => setForm({...form, linkedin: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Portfolio URL</label>
                  <input 
                    value={form.portfolio} 
                    onChange={e => setForm({...form, portfolio: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Foto Profil URL (Kosongkan utk Lokal/Default)</label>
                  <input 
                    value={form.avatarUrl} 
                    onChange={e => setForm({...form, avatarUrl: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl text-sm border border-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-neutral-800/50">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold text-on-surface-variant hover:bg-surface-container transition-colors">Batal</button>
              <button onClick={handleSaveProfile} className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors border border-purple-500/30 flex items-center gap-2 shadow-none cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">save</span> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Progress;
