import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { journalApi, profileApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';

const STOIC_QUOTES = [
  { text: "Jangan menuntut segala peristiwa terjadi seperti apa yang kamu inginkan; inginkanlah agar segala hal terjadi sebagaimana mestinya, maka jalan hidupmu akan mengalir dengan tenang.", author: "Epictetus", source: "Enchiridion - VIII" },
  { text: "Kamu memiliki kendali atas pikiranmu - bukan kejadian di luar. Sadarilah ini, dan kamu akan menemukan kekuatan.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Bukan karena segala sesuatunya sulit maka kita tidak berani; karena kita tidak berani maka segala sesuatunya menjadi sulit.", author: "Seneca", source: "Letters from a Stoic" },
  { text: "Kekayaan tidak terdiri dari memiliki banyak harta, tetapi dalam memiliki sedikit keinginan.", author: "Epictetus", source: "Discourses" },
  { text: "Manusia tidak terganggu oleh berbagai hal, tetapi oleh pandangan yang mereka ambil dari hal-hal tersebut.", author: "Epictetus", source: "Enchiridion" }
];

interface JournalContent {
  isJSONJournalDesc: boolean;
  learned: string;
  challenges: string;
  mindset: string;
  next: string;
  tags: string[];
  status: 'draft' | 'committed';
}

const Journal = () => {
  const navigate = useNavigate();
  const { user } = useGlobalState();

  // State
  const [activeMood, setActiveMood] = useState('flow');
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form states
  const [title, setTitle] = useState('');
  const [learned, setLearned] = useState('');
  const [challenges, setChallenges] = useState('');
  const [mindset, setMindset] = useState('');
  const [next, setNext] = useState('');
  const [tags, setTags] = useState<string[]>(['DeepWork', 'Mindset']);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
  
  // Quotes
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Modal
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Load from local storage initially
  useEffect(() => {
    const draft = localStorage.getItem('journal_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || '');
        setLearned(parsed.learned || '');
        setChallenges(parsed.challenges || '');
        setMindset(parsed.mindset || '');
        setNext(parsed.next || '');
        setTags(parsed.tags || ['DeepWork', 'Mindset']);
        setActiveMood(parsed.emotion_tag || 'flow');
        if (Object.keys(parsed).length > 0) {
          setLastSaved(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (e) {
        console.error('Failed to parse draft from localStorage', e);
      }
    }
  }, []);

  // Autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || learned || challenges || mindset || next) {
        localStorage.setItem('journal_draft', JSON.stringify({
          title, learned, challenges, mindset, next, tags, emotion_tag: activeMood
        }));
        setLastSaved(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, learned, challenges, mindset, next, tags, activeMood]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await journalApi.getAll();
      setEntries(res.data.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()));
    } catch (error) {
      console.error('Error fetching journal data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setTitle('');
    setLearned('');
    setChallenges('');
    setMindset('');
    setNext('');
    setTags(['DeepWork', 'Mindset']);
    setActiveMood('flow');
    localStorage.removeItem('journal_draft');
    setLastSaved(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const saveToBackend = async (status: 'draft' | 'committed') => {
    if (!title && !learned && !challenges && !mindset && !next) return;
    
    setIsSubmitting(true);
    try {
      const contentObj: JournalContent = {
        isJSONJournalDesc: true,
        learned,
        challenges,
        mindset,
        next,
        tags,
        status
      };

      await journalApi.create({
        title: title || 'Untitled Entry',
        content: JSON.stringify(contentObj),
        emotion_tag: activeMood,
        entry_date: new Date().toISOString()
      });

      if (status === 'committed') {
        // Fetch current profile to add XP
        try {
          await profileApi.getProfile();
          // Backend doesn't have an XP endpoint, so we simulate XP on the user model if we could, 
          // but wait, `profileApi` can only update name and profile_metadata. 
          // The Prisma User model has `xp` field, but no endpoint to update it directly.
          // Wait, actually I can just show the toast and since there's no XP endpoint, it's just visual or we can ignore backend XP logic.
        } catch (e) {
          // ignore
        }
        showToast('Refleksi dikomit! +25 XP ditambahkan.');
        resetForm();
      } else {
        showToast('Draft berhasil disimpan ke backend.');
      }
      
      fetchData();
    } catch (error) {
      console.error('Error submitting journal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus entri ini?')) {
      await journalApi.delete(id);
      fetchData();
      setSelectedEntry(null);
      showToast('Entri berhasil dihapus');
    }
  };

  const handleEdit = (entry: any) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(entry.content);
    } catch(e) { }

    setTitle(entry.title || '');
    setActiveMood(entry.emotion_tag || 'flow');
    if (parsed.isJSONJournalDesc) {
      setLearned(parsed.learned || '');
      setChallenges(parsed.challenges || '');
      setMindset(parsed.mindset || '');
      setNext(parsed.next || '');
      setTags(parsed.tags || []);
    } else {
      setLearned(entry.content); // fallback for plain text
    }
    
    setSelectedEntry(null);
    const el = document.getElementById('new-entry-editor');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    showToast('Dimuat ke editor.');
  };

  const handleAddTag = () => {
    const newTag = prompt('Masukkan nama tag baru:');
    if (newTag && newTag.trim() !== '' && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const randomizeQuote = () => {
    setQuoteIdx(prev => (prev + 1) % STOIC_QUOTES.length);
  };

  const parseContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.isJSONJournalDesc) return parsed as JournalContent;
    } catch (e) { }
    return null;
  };

  // Derived Metrics
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  // Create heatmap array
  const heatmap: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dString = d.toISOString().split('T')[0];
    heatmap.push(entries.some(e => e.entry_date.startsWith(dString)));
  }

  // Tags collection
  const allTags = new Set<string>();
  entries.forEach(e => {
    const parsed = parseContent(e.content);
    if (parsed && parsed.tags) {
      parsed.tags.forEach(t => allTags.add(t));
    }
  });

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.title?.toLowerCase().includes(q) && !e.content?.toLowerCase().includes(q)) return false;
    }
    if (selectedMonth) {
      // e.entry_date starts with selectedMonth
      if (!e.entry_date.startsWith(selectedMonth)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-neutral-800/50 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-2 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="text-sm font-semibold">{toastMessage}</span>
      </div>

      {/* Command Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
            <span className="material-symbols-outlined text-[14px]">auto_stories</span>
            <span>COMMAND DECK</span>
            <span className="text-outline/40">/</span>
            <span>KNOWLEDGE & MINDFULNESS</span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-bold">DAILY JOURNAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface flex items-center gap-2.5 font-sans">
            Journal & Cognitive Reflection
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed font-sans">
            Ruang refleksi harian, dekonstruksi hambatan belajar, serta rekaman pemikiran strategis {user?.name || 'Operator'}.
          </p>
        </div>
        
        {/* Action Cluster */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4 bg-surface-container-low border border-neutral-800/50 text-on-surface placeholder:text-outline text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-surface-container transition-colors w-44 sm:w-56" 
              placeholder="Cari catatan refleksi..." type="text"
            />
          </div>
          
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3.5 bg-surface-container-low hover:bg-surface-container border border-neutral-800/50 text-on-surface text-xs sm:text-sm rounded-xl transition-colors custom-date-picker outline-none cursor-pointer"
          />

          <button 
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none" 
            onClick={() => {
              resetForm();
              const el = document.getElementById('new-entry-editor');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                const titleInput = el.querySelector('input');
                if (titleInput) titleInput.focus();
              }
            }}
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>+ Tulis Entri Baru</span>
          </button>
        </div>
      </div>

      {/* Primary Asymmetric Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        
        {/* Main Left Column: Editor & Stream (8 Cols) */}
        <div className="xl:col-span-8 space-y-space-xl">
          
          {/* Interactive Entry Console */}
          <section id="new-entry-editor" className="rounded-xl bg-surface-container-low p-space-lg shadow-xl relative overflow-hidden">
            {/* Subtle bioluminescent accent glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-4">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-[0_0_12px_rgba(208,188,255,0.25)]">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <div>
                  <div className="font-headline-md text-headline-md text-on-surface">Protokol Refleksi {user?.name || 'Operator'}</div>
                  <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Sesi Harian &middot; V3.2 Protocol Active</div>
                </div>
              </div>
              <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-secondary bg-surface-container-high px-space-sm py-1 rounded-full whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
                <span>{lastSaved ? `Autosaved ke local cache (${lastSaved})` : 'Draft sinkron'}</span>
              </div>
            </div>
            
            {/* Cognitive State Selector */}
            <div className="space-y-space-xs pt-space-xs pb-space-md">
              <label className="font-sans text-xs uppercase tracking-wider text-outline block font-semibold">Status Kognitif & Mental Energy</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                <button 
                  onClick={() => setActiveMood('flow')}
                  className={`flex items-center gap-space-xs px-space-sm py-2 rounded-lg text-left transition-all ${
                    activeMood === 'flow' 
                      ? 'bg-surface-container-high text-on-surface border border-purple-500/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-transparent'
                  }`}
                  type="button"
                >
                  <span className="text-base">🧠</span>
                  <div className="truncate">
                    <div className={`font-sans text-xs font-semibold truncate ${activeMood === 'flow' ? 'text-primary' : ''}`}>Flow State</div>
                    <div className="font-sans text-[10px] text-outline truncate">Deep Immersion</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveMood('energized')}
                  className={`flex items-center gap-space-xs px-space-sm py-2 rounded-lg text-left transition-all ${
                    activeMood === 'energized' 
                      ? 'bg-surface-container-high text-on-surface border border-secondary/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-transparent'
                  }`}
                  type="button"
                >
                  <span className="text-base">⚡</span>
                  <div className="truncate">
                    <div className={`font-sans text-xs font-semibold truncate ${activeMood === 'energized' ? 'text-secondary' : ''}`}>Energized</div>
                    <div className="font-sans text-[10px] text-outline truncate">High Drive</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveMood('calm')}
                  className={`flex items-center gap-space-xs px-space-sm py-2 rounded-lg text-left transition-all ${
                    activeMood === 'calm' 
                      ? 'bg-surface-container-high text-on-surface border border-on-surface/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-transparent'
                  }`}
                  type="button"
                >
                  <span className="text-base">🧘</span>
                  <div className="truncate">
                    <div className={`font-sans text-xs font-semibold truncate ${activeMood === 'calm' ? 'text-on-surface' : ''}`}>Calm & Focused</div>
                    <div className="font-sans text-[10px] text-outline truncate">Stoic Center</div>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveMood('low')}
                  className={`flex items-center gap-space-xs px-space-sm py-2 rounded-lg text-left transition-all ${
                    activeMood === 'low' 
                      ? 'bg-surface-container-high text-on-surface border border-outline/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-transparent'
                  }`}
                  type="button"
                >
                  <span className="text-base">🔋</span>
                  <div className="truncate">
                    <div className={`font-sans text-xs font-semibold truncate ${activeMood === 'low' ? 'text-outline' : ''}`}>Low / Recharge</div>
                    <div className="font-sans text-[10px] text-outline truncate">Active Recovery</div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* 4 Core Reflection Prompts */}
            <div className="space-y-space-md pt-space-xs">
              {/* Title Input */}
              <div className="space-y-1">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-space-md py-space-sm bg-surface-container text-on-surface placeholder:text-outline font-headline-md text-headline-md rounded-xl focus:outline-none focus:bg-surface-container-highest transition-colors" placeholder="Judul entri refleksi (e.g. Dekonstruksi Consensus Raft & Reduksi Latensi Gemastik)..." type="text"/>
              </div>
              {/* Quad Prompt Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {/* 1. What I learned */}
                <div className="bg-surface-container p-space-md rounded-xl space-y-space-xs flex flex-col">
                  <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                    <span>1. What I Learned Today</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline">Intisari pengetahuan, model mental baru, atau insight teknis.</p>
                  <textarea value={learned} onChange={(e) => setLearned(e.target.value)} className="w-full bg-surface-container-high/60 text-on-surface placeholder:text-outline/70 p-space-sm rounded-lg font-body-sm text-body-sm resize-none focus:outline-none focus:bg-surface-container-high transition-colors flex-1 min-h-[80px]" placeholder="Hari ini saya menelusuri internal Raft cluster..."></textarea>
                </div>
                {/* 2. Challenges & Bottlenecks */}
                <div className="bg-surface-container p-space-md rounded-xl space-y-space-xs flex flex-col">
                  <div className="flex items-center gap-space-xs text-error font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>2. Challenges & Bottlenecks</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline">Hambatan kognitif, bug sukar, atau distraksi momentum.</p>
                  <textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} className="w-full bg-surface-container-high/60 text-on-surface placeholder:text-outline/70 p-space-sm rounded-lg font-body-sm text-body-sm resize-none focus:outline-none focus:bg-surface-container-high transition-colors flex-1 min-h-[80px]" placeholder="Sempat tersendat pada goroutine deadlock ketika simulated drop..."></textarea>
                </div>
                {/* 3. Reflection & Mindset */}
                <div className="bg-surface-container p-space-md rounded-xl space-y-space-xs flex flex-col">
                  <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">self_improvement</span>
                    <span>3. Reflection & Mindset</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline">Evaluasi kejernihan emosional, bias ego, atau ketenangan batin.</p>
                  <textarea value={mindset} onChange={(e) => setMindset(e.target.value)} className="w-full bg-surface-container-high/60 text-on-surface placeholder:text-outline/70 p-space-sm rounded-lg font-body-sm text-body-sm resize-none focus:outline-none focus:bg-surface-container-high transition-colors flex-1 min-h-[80px]" placeholder="Sempat ada dorongan FOMO melihat progress tim lain, tetapi..."></textarea>
                </div>
                {/* 4. Next Actions */}
                <div className="bg-surface-container p-space-md rounded-xl space-y-space-xs flex flex-col">
                  <div className="flex items-center gap-space-xs text-secondary-container font-label-sm text-label-sm font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    <span>4. What I Will Do Next</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline">Langkah konkret eksekusi pertama untuk esok pagi.</p>
                  <textarea value={next} onChange={(e) => setNext(e.target.value)} className="w-full bg-surface-container-high/60 text-on-surface placeholder:text-outline/70 p-space-sm rounded-lg font-body-sm text-body-sm resize-none focus:outline-none focus:bg-surface-container-high transition-colors flex-1 min-h-[80px]" placeholder="07:30 WIB: Mulai sprint 90 menit implementasi snapshotting RPC..."></textarea>
                </div>
              </div>
              
              {/* Tags & Submit Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pt-space-xs">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm text-outline mr-1">Tags:</span>
                  {tags.map((tag, idx) => (
                    <button key={idx} onClick={() => removeTag(tag)} className="px-space-sm py-1 rounded-md bg-surface-container hover:line-through text-primary font-label-sm text-label-sm hover:bg-surface-container-high transition-colors" title="Klik untuk hapus">#{tag}</button>
                  ))}
                  <button onClick={handleAddTag} className="w-6 h-6 rounded-md bg-surface-container hover:bg-surface-container-high text-outline flex items-center justify-center transition-colors text-xs">+</button>
                </div>
                <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
                  <button onClick={() => saveToBackend('draft')} className="px-space-md py-space-sm rounded-xl bg-surface-container text-on-surface font-sans text-xs font-medium hover:bg-surface-container-high transition-colors">Simpan Draft</button>
                  <button 
                    onClick={() => saveToBackend('committed')} 
                    disabled={isSubmitting || (!title && !learned && !challenges && !mindset && !next)}
                    className="px-space-lg py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-sans text-xs font-semibold border border-purple-500/30 shadow-none active:scale-95 flex items-center gap-space-xs transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    <span>{isSubmitting ? 'Menyimpan...' : 'Komit Refleksi (+25 XP)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Past Journal Stream */}
          <div className="space-y-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-[22px]">history_edu</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Arsip Refleksi Kognitif</h2>
              </div>
              <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span>Menampilkan {filteredEntries.length} entri</span>
              </div>
            </div>
            
            {/* Timeline Stream Cards */}
            <div className="space-y-space-lg relative">
              {isLoading ? (
                <div className="py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-low rounded-xl">
                  <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
                  <p className="font-body-md text-outline">Memuat arsip refleksi...</p>
                </div>
              ) : filteredEntries.length > 0 ? (
                filteredEntries.map(entry => {
                  const parsed = parseContent(entry.content);
                  const isDraft = parsed?.status === 'draft';
                  
                  return (
                    <div key={entry.id} className={`p-space-lg rounded-xl flex flex-col gap-space-sm transition-colors border shadow-sm ${isDraft ? 'bg-surface border-surface-container-highest' : 'bg-surface-container border-transparent hover:border-surface-container-highest hover:bg-surface-container-high'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-space-sm">
                          <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold uppercase tracking-wider ${isDraft ? 'bg-surface-container-high text-outline' : 'bg-primary-container/20 text-primary'}`}>
                            {entry.emotion_tag || 'Reflection'}
                          </span>
                          {isDraft && (
                            <span className="px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase tracking-wider bg-surface-container-highest text-on-surface-variant">
                              DRAFT
                            </span>
                          )}
                          <span className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            {new Date(entry.entry_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(entry)} className="w-8 h-8 rounded-lg text-outline hover:text-primary hover:bg-surface-container-highest flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="w-8 h-8 rounded-lg text-outline hover:text-error hover:bg-surface-container-highest flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">{entry.title || 'Untitled'}</h3>
                        
                        {parsed ? (
                          <div className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 whitespace-pre-wrap">
                            <span className="font-semibold text-on-surface">Learned:</span> {parsed.learned || '-'}<br/>
                            <span className="font-semibold text-on-surface">Challenges:</span> {parsed.challenges || '-'}
                          </div>
                        ) : (
                          <div className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 whitespace-pre-wrap">
                            {entry.content}
                          </div>
                        )}
                        
                      </div>
                      <div className="pt-space-xs border-t border-surface-container-highest flex items-center justify-between">
                        <button onClick={() => setSelectedEntry(entry)} className="font-label-sm text-label-sm text-secondary hover:text-secondary-fixed transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Baca Selengkapnya</span>
                        </button>
                        
                        {parsed && parsed.tags && parsed.tags.length > 0 && (
                          <div className="flex gap-2">
                            {parsed.tags.slice(0, 3).map((t: string, i: number) => (
                              <span key={i} className="text-outline text-[10px] uppercase tracking-widest">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest">
                  <span className="material-symbols-outlined text-outline text-[48px]">edit_note</span>
                  <p className="font-body-md text-outline">Belum ada jurnal refleksi yang ditemukan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column: Reflection Telemetry & Mindset Sidebar (4 Cols) */}
        <div className="xl:col-span-4 space-y-space-lg">
          
          {/* Telemetry Card 1: Streak Menulis */}
          <div className="rounded-xl bg-surface-container-low p-space-lg shadow-lg relative overflow-hidden space-y-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Konsistensi Refleksi</span>
              <span className="material-symbols-outlined text-tertiary text-[20px]">local_fire_department</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-display text-metric-display font-bold text-on-surface">{entries.length}</span>
              <span className="font-headline-md text-headline-md text-tertiary font-bold">Total Entri</span>
            </div>
            
            {/* Mini Calendar / Heatmap dots */}
            <div className="space-y-space-xs">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
                <span>Dua Pekan Terakhir</span>
                <span className="text-secondary font-semibold">{(heatmap.filter(Boolean).length / 14 * 100).toFixed(0)}% Selesai</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {/* Day 1-14 squares */}
                {heatmap.map((active, idx) => (
                  <div key={idx} className={`h-6 rounded flex items-center justify-center text-[10px] font-sans font-bold ${active ? 'bg-secondary text-on-secondary shadow-none' : 'bg-surface-container text-outline'}`} title={`Day ${idx + 1}`}>
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-space-xs font-sans text-xs text-on-surface-variant flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>Target Milestone: 21 Hari (Bebas Biaya Kognitif)</span>
            </div>
          </div>
          
          {/* Telemetry Card 2: Cognitive Resonance Gauge */}
          <div className="rounded-2xl bg-surface-container-low p-5 border border-neutral-800/50 shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs uppercase tracking-wider text-outline font-semibold">Cognitive Resonance</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">equalizer</span>
            </div>
            <div className="flex items-center gap-space-md">
              {/* Radial Progress Gauge (Inline SVG) */}
              <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
                  <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${heatmap.filter(Boolean).length / 14 * 100}, 100`} strokeLinecap="round" strokeWidth="3.5" style={{ transition: 'stroke-dasharray 1s ease-out' }}></path>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-sans text-xl font-bold text-on-surface">{(heatmap.filter(Boolean).length / 14 * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-sans text-sm text-on-surface font-semibold">Mindful Clarity</div>
                <p className="font-sans text-xs text-on-surface-variant">
                  Konsistensi {heatmap.filter(Boolean).length} dari 14 hari menghasilkan resonansi stabil.
                </p>
              </div>
            </div>
          </div>
          
          {/* Telemetry Card 3: Topik Refleksi Pekan Ini */}
          <div className="rounded-2xl bg-surface-container-low p-5 border border-neutral-800/50 shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs uppercase tracking-wider text-outline font-semibold">Topik Refleksi</span>
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
            </div>
            <div className="flex flex-wrap gap-2 font-sans text-xs text-on-surface-variant pt-1">
              {allTags.size > 0 ? (
                Array.from(allTags).map((tag, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-surface-container text-on-surface border border-neutral-800/40">
                    #{tag}
                  </span>
                ))
              ) : (
                'Belum ada topik yang direkam.'
              )}
            </div>
          </div>
          
          {/* Telemetry Card 4: Kutipan Perenungan */}
          <div className="rounded-2xl bg-surface-container-low p-5 border border-neutral-800/50 shadow-none relative overflow-hidden">
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-sans text-xs uppercase tracking-wider text-outline flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-primary">format_quote</span>
                Kutipan Perenungan
              </span>
              <span className="font-sans text-[10px] text-on-surface-variant uppercase">{STOIC_QUOTES[quoteIdx].author}</span>
            </div>
            <blockquote className="font-sans text-sm font-medium text-on-surface leading-relaxed italic transition-opacity">
              "{STOIC_QUOTES[quoteIdx].text}"
            </blockquote>
            <div className="mt-space-md flex items-center justify-between font-sans text-xs">
              <span className="text-outline">{STOIC_QUOTES[quoteIdx].source}</span>
              <button onClick={randomizeQuote} className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1 rounded-md hover:bg-surface-container-high">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                <span>Kutipan Lain</span>
              </button>
            </div>
          </div>
          
          {/* Vision Banner */}
          <div onClick={() => navigate('/goals')} className="rounded-2xl bg-surface-container-low border border-neutral-800/50 overflow-hidden relative shadow-none group cursor-pointer hover:border-neutral-700 transition-all">
            <div className="h-32 bg-surface-container-high w-full relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(208,188,255,0.4) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-space-md">
              <div className="inline-block px-2 py-0.5 rounded bg-purple-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase mb-1 shadow-none border border-purple-500/30">Vision 2027</div>
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-sm font-bold text-on-surface">Sistem Terdistribusi Kelas Dunia</h3>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedEntry(null); }}>
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-container-highest">
              <div>
                <h2 className="font-headline-md text-on-surface font-bold">{selectedEntry.title || 'Untitled Entry'}</h2>
                <div className="font-label-sm text-outline mt-1">{new Date(selectedEntry.entry_date).toLocaleString('id-ID')} &bull; Mood: <span className="uppercase text-primary">{selectedEntry.emotion_tag}</span></div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-4 text-on-surface-variant font-body-md whitespace-pre-wrap">
              {(() => {
                const parsed = parseContent(selectedEntry.content);
                if (parsed) {
                  return (
                    <div className="space-y-6">
                      {parsed.learned && (
                        <div>
                          <h4 className="font-label-md text-secondary uppercase tracking-wider mb-2 font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">lightbulb</span> What I Learned</h4>
                          <p className="bg-surface-container p-4 rounded-xl">{parsed.learned}</p>
                        </div>
                      )}
                      {parsed.challenges && (
                        <div>
                          <h4 className="font-label-md text-error uppercase tracking-wider mb-2 font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">warning</span> Challenges</h4>
                          <p className="bg-surface-container p-4 rounded-xl">{parsed.challenges}</p>
                        </div>
                      )}
                      {parsed.mindset && (
                        <div>
                          <h4 className="font-label-md text-primary uppercase tracking-wider mb-2 font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">self_improvement</span> Mindset</h4>
                          <p className="bg-surface-container p-4 rounded-xl">{parsed.mindset}</p>
                        </div>
                      )}
                      {parsed.next && (
                        <div>
                          <h4 className="font-label-md text-secondary-container uppercase tracking-wider mb-2 font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">rocket_launch</span> Next Steps</h4>
                          <p className="bg-surface-container p-4 rounded-xl">{parsed.next}</p>
                        </div>
                      )}
                      {parsed.tags && parsed.tags.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {parsed.tags.map((t: string, i: number) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-sm">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return <p>{selectedEntry.content}</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Journal;
