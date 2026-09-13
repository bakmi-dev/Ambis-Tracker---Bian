import { useState, useEffect } from 'react';
import { analyticsApi, learningApi, projectApi, competitionApi, profileApi, taskApi, studySessionApi } from '../api';
import Avatar from '../components/common/Avatar';

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
  const [metrics, setMetrics] = useState({
    xp: 0,
    streak: 0,
    studyMinutes: 0,
    tasksCompleted: 0,
    learningPaths: 0,
    projectsAndComps: 0
  });
  
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Operator',
    tagline: 'Cognitive Architect',
    bio: '',
    location: 'Global Workspace',
    role: 'CS Undergraduate',
    github: '',
    linkedin: '',
    portfolio: '',
    avatarUrl: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form, setForm] = useState<ProfileData>(profile);

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
          const pData = {
            name: u.name || 'Operator',
            tagline: u.role_track || 'Cognitive Architect',
            bio: u.bio || 'Membangun disiplin kognitif, menguasai sistem terdistribusi, dan konsisten belajar setiap hari tanpa distraksi.',
            location: 'Global Workspace',
            role: u.role_track || 'CS Undergraduate',
            github: u.github || '',
            linkedin: u.linkedin || '',
            portfolio: u.website || '',
            avatarUrl: u.avatar_url || ''
          };
          setProfile(pData);
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
    setForm(profile);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await profileApi.updateProfile({
        name: form.name,
        role_track: form.role,
        bio: form.bio,
        github: form.github,
        linkedin: form.linkedin,
        website: form.portfolio,
        avatar_url: form.avatarUrl
      });
      setProfile(form);
      setIsEditModalOpen(false);
      setImgError(false); // reset error state in case URL changed
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const url = `https://${profile.portfolio}`;
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
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-surface-container-highest px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-2 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="font-label-md font-semibold">{toastMessage}</span>
      </div>

      {/* Ambient background glow accents */}
      <div className="absolute -top-10 right-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute top-80 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      
      <div className="w-full max-w-7xl mx-auto space-y-space-xl pb-space-xl">
        {/* Header & Breadcrumb Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline tracking-wider uppercase">
              <span>Command Deck</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Personal Identity</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-secondary font-semibold">{profile.name}'s Profile</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">Personal Profile & Growth Overview</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">Identitas personal, ringkasan level perkembangan, lencana pencapaian, dan jejak langkah kognitif {profile.name}.</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-space-sm shrink-0">
            <button onClick={openEditModal} className="flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-body-sm font-semibold transition-all">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">edit</span>
              <span>Edit Profil</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-semibold shadow-[0_0_24px_rgba(208,188,255,0.35)] hover:opacity-95 transition-all">
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>Bagikan Portofolio</span>
            </button>
          </div>
        </div>

        {/* Personal Identity Hero Card */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-sm">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg w-full lg:w-auto">
              {/* Avatar + Status Pill */}
              <div className="relative shrink-0">
                <Avatar src={profile.avatarUrl} name={profile.name} size="xl" />
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold shadow-md flex items-center gap-0.5">
                  <span>LV</span>
                  <span>{level}</span>
                </div>
              </div>
              
              {/* Bio and Metadata */}
              <div className="space-y-space-xs max-w-2xl">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">{profile.name}</h2>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-medium tracking-wide">{profile.tagline}</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {profile.bio}
                </p>
                
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
                  <div className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                    <span>{profile.location}</span>
                  </div>
                  <div className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] text-primary">school</span>
                    <span>{profile.role}</span>
                  </div>
                  <div className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container font-label-sm text-label-sm text-secondary font-semibold">
                    <span className="material-symbols-outlined text-[14px] text-secondary">bolt</span>
                    <span>Level {level} Scholar ({currentLevelXp} / 100 XP)</span>
                  </div>
                  <div className="flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container font-label-sm text-label-sm text-tertiary font-semibold">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">local_fire_department</span>
                    <span>{metrics.streak} Days Continuous Streak</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Links / Socials */}
            <div className="flex lg:flex-col flex-wrap gap-space-xs w-full lg:w-auto shrink-0 pt-space-sm lg:pt-0">
              <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-space-md px-space-md py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface group">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">code</span>
                  <span className="font-label-md text-label-md">GitHub</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">@{profile.github}</span>
              </a>
              <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-space-md px-space-md py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface group">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-secondary transition-colors">work</span>
                  <span className="font-label-md text-label-md">LinkedIn</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">/in/{profile.linkedin}</span>
              </a>
              <a href={`https://${profile.portfolio}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-space-md px-space-md py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface group">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-tertiary transition-colors">public</span>
                  <span className="font-label-md text-label-md">Portfolio</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{profile.portfolio}</span>
              </a>
            </div>
          </div>
          
          {/* XP Bar Progress Tracker Minimal */}
          <div className="mt-space-lg pt-space-md space-y-space-xs border-t border-surface-container-highest/30">
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-on-surface-variant uppercase tracking-wider">Level {level} &rarr; Level {level + 1} Progress</span>
              <span className="text-primary font-bold">{currentLevelXp}% &bull; {100 - currentLevelXp} XP to Level {level + 1}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary" style={{ width: `${currentLevelXp}%` }}></div>
            </div>
          </div>
        </div>

        {/* Simplified Growth Summary (Clean & Minimal stat cards) */}
        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px] text-secondary">query_stats</span>
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Growth Metrics</h3>
            </div>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Status: Optimal Flow</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Metric 1 */}
            <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm hover:bg-surface-container hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Total Fokus</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary shadow-[0_0_12px_rgba(76,215,246,0.15)]">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
              </div>
              <div>
                <div className="font-metric-display text-[32px] text-on-surface font-bold tracking-tight">{Math.floor(metrics.studyMinutes / 60)} Jam {metrics.studyMinutes % 60}m</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{metrics.studyMinutes > 0 ? 'Waktu intensif terakumulasi' : 'Belum ada deep work'}</p>
              </div>
            </div>
            {/* Metric 2 */}
            <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm hover:bg-surface-container hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Tugas Tuntas</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shadow-[0_0_12px_rgba(208,188,255,0.15)]">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
              </div>
              <div>
                <div className="font-metric-display text-[32px] text-on-surface font-bold tracking-tight">{metrics.tasksCompleted} Tugas</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{metrics.tasksCompleted > 0 ? 'Modul & task diselesaikan' : 'Belum ada tugas selesai'}</p>
              </div>
            </div>
            {/* Metric 3 */}
            <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm hover:bg-surface-container hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Jalur Belajar</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary shadow-[0_0_12px_rgba(255,176,205,0.15)]">
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                </div>
              </div>
              <div>
                <div className="font-metric-display text-[32px] text-on-surface font-bold tracking-tight">{metrics.learningPaths} Topik</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{metrics.learningPaths > 0 ? 'Materi/Roadmap ditekuni' : 'Belum ada aktivitas'}</p>
              </div>
            </div>
            {/* Metric 4 */}
            <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm hover:bg-surface-container hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Kompetisi & Proyek</span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary-container shadow-[0_0_12px_rgba(3,181,211,0.2)]">
                  <span className="material-symbols-outlined text-[18px]">military_tech</span>
                </div>
              </div>
              <div>
                <div className="font-metric-display text-[32px] text-on-surface font-bold tracking-tight">{metrics.projectsAndComps} Target</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{metrics.projectsAndComps > 0 ? 'Aktif dalam pipeline' : 'Belum ada pencapaian'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="font-headline-md text-on-surface font-bold mb-4">Edit Personal Profile</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Nama Lengkap / Display Name</label>
                  <input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Tagline / Title</label>
                  <input 
                    value={form.tagline} 
                    onChange={e => setForm({...form, tagline: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Bio Singkat</label>
                  <textarea 
                    value={form.bio} 
                    onChange={e => setForm({...form, bio: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none border border-surface-container-highest" 
                    rows={3} 
                  ></textarea>
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Lokasi</label>
                  <input 
                    value={form.location} 
                    onChange={e => setForm({...form, location: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Status Akademik / Role</label>
                  <input 
                    value={form.role} 
                    onChange={e => setForm({...form, role: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">GitHub Username</label>
                  <input 
                    value={form.github} 
                    onChange={e => setForm({...form, github: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">LinkedIn URL Segment</label>
                  <input 
                    value={form.linkedin} 
                    onChange={e => setForm({...form, linkedin: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Portfolio URL</label>
                  <input 
                    value={form.portfolio} 
                    onChange={e => setForm({...form, portfolio: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-outline mb-1 uppercase tracking-wider font-semibold">Foto Profil URL (Kosongkan utk Lokal/Default)</label>
                  <input 
                    value={form.avatarUrl} 
                    onChange={e => setForm({...form, avatarUrl: e.target.value})} 
                    className="w-full bg-surface-container text-on-surface px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-highest" 
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-container-highest">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container transition-colors font-semibold">Batal</button>
              <button onClick={handleSaveProfile} className="px-5 py-2.5 rounded-xl font-label-md bg-primary-container text-on-primary-container font-bold hover:bg-inverse-primary transition-colors shadow-sm flex items-center gap-2">
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
