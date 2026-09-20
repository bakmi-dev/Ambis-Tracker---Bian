import { useState, useEffect, useCallback } from 'react';
import { knowledgeApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  tags: string[];
  updated_at: string;
}

interface ExternalLinkData {
  isExternalLink: boolean;
  url: string;
  type: string;
}

const KnowledgeBase = () => {
  const { user } = useGlobalState();
  const [activeDoc, setActiveDoc] = useState<KnowledgeDoc | null>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showExtModal, setShowExtModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  // Forms state
  const [extTitle, setExtTitle] = useState('');
  const [extType, setExtType] = useState('Google Docs');
  const [extUrl, setExtUrl] = useState('');
  const [extTags, setExtTags] = useState('');
  
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'external'>('all');
  const [toastMessage, setToastMessage] = useState('');
  const [isSnippetsVisible, setIsSnippetsVisible] = useState(true);

  const fetchDocs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await knowledgeApi.getAll();
      setDocs(res.data);
    } catch (error) {
      console.error('Error fetching knowledge docs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const parseTags = (str: string) => {
    return str.split(',').map(s => s.trim()).filter(s => s !== '');
  };

  const handleCreateExtLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extTitle || !extUrl) return;
    try {
      const payload: ExternalLinkData = {
        isExternalLink: true,
        url: extUrl,
        type: extType
      };
      
      await knowledgeApi.create({
        title: extTitle,
        category: 'External Link',
        content: JSON.stringify(payload),
        tags: parseTags(extTags)
      });
      
      setShowExtModal(false);
      setExtTitle('');
      setExtUrl('');
      setExtTags('');
      showToast('Tautan eksternal berhasil ditambahkan!');
      fetchDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;
    try {
      await knowledgeApi.create({
        title: noteTitle,
        category: 'Local Note',
        content: noteContent, // Plain string
        tags: parseTags(noteTags)
      });
      
      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
      showToast('Catatan lokal berhasil dibuat!');
      fetchDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus dokumen ini?')) {
      try {
        await knowledgeApi.delete(id);
        if (activeDoc?.id === id) setActiveDoc(null);
        showToast('Dokumen berhasil dihapus');
        fetchDocs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Snippet berhasil disalin ke clipboard!');
  };

  const parseContent = (content: string): ExternalLinkData | null => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.isExternalLink) return parsed;
    } catch {
      // not json or not external link
    }
    return null;
  };

  // Derived states
  const filteredDocs = docs.filter(doc => {
    const isExt = parseContent(doc.content) !== null;
    
    // Search logic
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!doc.title.toLowerCase().includes(q) && !doc.content.toLowerCase().includes(q) && !doc.tags.some(t => t.toLowerCase().includes(q))) {
        return false;
      }
    }
    
    // Tab logic
    if (activeTab === 'pinned' && !doc.is_pinned) return false;
    if (activeTab === 'external' && !isExt) return false;
    
    return true;
  });

  const categories = Array.from(new Set(docs.map(d => d.category || 'Uncategorized')));
  const pinnedDocs = docs.filter(d => d.is_pinned);
  const extDocs = docs.filter(d => parseContent(d.content) !== null);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-[300] bg-surface-container-high text-on-surface border border-neutral-800/50 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform flex items-center gap-2 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="text-sm font-semibold">{toastMessage}</span>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-on-surface-variant animate-pulse">Memuat pengetahuan...</p>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Quick Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-secondary font-semibold flex-wrap">
            <span className="material-symbols-outlined text-[14px]">library_books</span>
            <span>COMMAND DECK</span>
            <span className="text-outline/40">/</span>
            <span>KNOWLEDGE & SECOND BRAIN</span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-bold">VAULT 0X7E3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface font-sans">
            Knowledge Base & Architecture Vault
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed font-sans">
            Pusat dokumentasi modular, catatan arsitektur sistem terdistribusi, ringkasan RFC, cheatsheets, dan arsip referensi teknis {user?.name || 'Operator'}.
          </p>
        </div>
        {/* Action Cluster */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <button 
            onClick={() => setShowExtModal(true)} 
            className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs sm:text-sm font-medium border border-neutral-800/50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_link</span>
            <span>+ Tautkan Docs/Sheets</span>
          </button>
          <button 
            onClick={() => setShowNoteModal(true)} 
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-purple-500/30 active:scale-95 shadow-none"
          >
            <span className="material-symbols-outlined text-[18px]">post_add</span>
            <span>+ Buat Catatan Baru</span>
          </button>
        </div>
      </div>

      {/* Telemetry & Knowledge Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Pod 1: Total Docs */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px] shadow-none">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Total Dokumen Vault</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">library_books</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{docs.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>{docs.length} catatan sinkron</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1 border-t border-neutral-800/30 font-normal">
            <span>Kapasitas Indeks:</span>
            <span className="text-on-surface font-semibold">Tersedia</span>
          </div>
        </div>

        {/* Pod 2: External Links */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px] shadow-none">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">External Links</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">link</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{extDocs.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-on-surface-variant font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>Docs & Sheets tertaut</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1 border-t border-neutral-800/30 font-normal">
            <span>Akses Cepat:</span>
            <span className="text-secondary font-semibold">Aktif</span>
          </div>
        </div>

        {/* Pod 3: Active Vault Domains */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px] shadow-none">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Domain Kategori</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">{categories.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-on-surface-variant truncate font-normal">
              <span>{categories.slice(0,2).join(', ')}{categories.length > 2 ? '...' : ''}</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1 border-t border-neutral-800/30 font-normal">
            <span>Kepadatan Konsep:</span>
            <span className="text-tertiary font-semibold">Optimal</span>
          </div>
        </div>

        {/* Pod 4: Sync & Telemetry Health */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-neutral-800/50 flex flex-col justify-between min-h-[140px] shadow-none">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase tracking-wider text-outline font-semibold">Obsidian Telemetry</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight leading-none font-sans">100%</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>Sinkronisasi aktif</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1 border-t border-neutral-800/30 font-normal">
            <span>Last Ping:</span>
            <span className="text-on-surface font-mono text-[11px]">Online</span>
          </div>
        </div>
      </div>

      {/* Search Ribbon with Quick Filter Tokens */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-neutral-800/50 shadow-none flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-16 bg-surface-container text-on-surface placeholder:text-outline text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-surface-container-high transition-colors border border-neutral-800/40" 
            placeholder="Cari catatan, tag (#raft, #concurrency), formula, atau cheatsheet..." type="text"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[11px] font-semibold pointer-events-none">⌘K</kbd>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button 
            onClick={() => setActiveTab('all')} 
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border ${
              activeTab === 'all' 
                ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
            }`}
          >
            Semua Tipe
          </button>
          <button 
            onClick={() => setActiveTab('pinned')} 
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border ${
              activeTab === 'pinned' 
                ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
            }`}
          >
            Terverifikasi (Pinned)
          </button>
          <button 
            onClick={() => setActiveTab('external')} 
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border ${
              activeTab === 'external' 
                ? 'bg-purple-600 text-white border-purple-500/30 font-semibold shadow-none' 
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-neutral-800/50'
            }`}
          >
            Tautan Docs
          </button>
        </div>
      </div>

      {/* Main Content Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start relative z-10 pb-space-xl">
        
        {/* Left Column: Directory Tree (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md sticky top-24">
          
          {/* Vault Views */}
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm">
            <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold mb-space-xs px-space-xs">
              Vault Views
            </div>
            <div className="space-y-1">
              <button onClick={() => setActiveTab('all')} className={`w-full flex items-center justify-between px-space-md py-2 rounded-xl transition-colors font-body-sm text-body-sm ${activeTab === 'all' ? 'bg-surface-container-high text-on-surface font-semibold' : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px] text-primary">folder_open</span>
                  <span>Semua Dokumen</span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{docs.length}</span>
              </button>
              <button onClick={() => setActiveTab('pinned')} className={`w-full flex items-center justify-between px-space-md py-2 rounded-xl transition-colors font-body-sm text-body-sm ${activeTab === 'pinned' ? 'bg-surface-container-high text-on-surface font-semibold' : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">star</span>
                  <span>Favorit & Pinned</span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{pinnedDocs.length}</span>
              </button>
              <button onClick={() => setActiveTab('external')} className={`w-full flex items-center justify-between px-space-md py-2 rounded-xl transition-colors font-body-sm text-body-sm ${activeTab === 'external' ? 'bg-surface-container-high text-on-surface font-semibold' : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'}`}>
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">link</span>
                  <span>Tautan Docs & Sheets</span>
                </div>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{extDocs.length}</span>
              </button>
            </div>
          </div>
          
          {/* Domain Directory Tree */}
          <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-space-sm px-space-xs shrink-0">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">Hasil Filter ({filteredDocs.length})</span>
            </div>
            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
                const isExt = parseContent(doc.content) !== null;
                return (
                  <div key={doc.id} onClick={() => setActiveDoc(doc)} className={`px-space-sm py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 font-body-sm text-body-sm ${activeDoc?.id === doc.id ? 'bg-primary-container text-on-primary-container font-semibold' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                    {isExt ? (
                      <span className="material-symbols-outlined text-[16px] text-tertiary">link</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                    )}
                    <div className="flex flex-col truncate w-full">
                      <span className="truncate">{doc.title}</span>
                      <span className="text-[10px] text-outline opacity-70 flex gap-1 items-center">
                        {isExt ? 'Eksternal' : 'Lokal'} {doc.is_pinned && <span className="material-symbols-outlined text-[10px] text-secondary">star</span>}
                      </span>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-on-surface-variant font-body-sm text-body-sm text-center py-4">Tidak ada dokumen yang cocok.</div>
              )}
            </div>
          </div>
          
        </div>
        
        {/* Right Column: Active Document Reader (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {activeDoc ? (
            <div className="p-space-xl rounded-2xl bg-surface-container-low shadow-sm h-full min-h-[600px] border border-surface-container-highest flex flex-col relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleDelete(activeDoc.id)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-error/20 hover:text-error text-outline flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>

              <div className="flex items-center gap-space-sm mb-4">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-label-sm uppercase tracking-wider">{activeDoc.category || 'Uncategorized'}</span>
                {activeDoc.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">#{tag}</span>
                ))}
              </div>
              <h2 className="font-headline-lg text-on-surface font-bold mb-6 pr-12">{activeDoc.title}</h2>
              
              {(() => {
                const extData = parseContent(activeDoc.content);
                if (extData) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 mb-6 bg-surface-container-high rounded-3xl flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-[48px] text-tertiary">link</span>
                      </div>
                      <h3 className="text-headline-sm font-bold text-on-surface mb-2">Tautan Dokumen Eksternal</h3>
                      <p className="text-on-surface-variant mb-6 max-w-md">Dokumen ini merupakan tautan ke platform <strong>{extData.type}</strong> eksternal. Silakan buka melalui tab baru.</p>
                      
                      <div className="flex gap-4">
                        <button onClick={() => handleCopySnippet(extData.url)} className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-2 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          Salin Link
                        </button>
                        <a href={extData.url} target="_blank" rel="noreferrer" className="px-6 py-2 rounded-xl bg-primary hover:brightness-110 text-on-primary font-bold flex items-center gap-2 transition-all">
                          Buka Dokumen di Tab Baru
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div className="prose prose-invert max-w-none text-on-surface-variant font-body-md whitespace-pre-wrap flex-1">
                      {activeDoc.content || <em className="text-outline">Catatan kosong.</em>}
                    </div>
                  )
                }
              })()}
              
              <div className="mt-8 pt-4 border-t border-surface-container-highest flex justify-between items-center text-label-sm text-outline">
                <span>Diperbarui: {new Date(activeDoc.updated_at).toLocaleString('id-ID')}</span>
                <span>ID: {activeDoc.id.substring(0, 8)}...</span>
              </div>
            </div>
          ) : (
            <div className="p-space-xl rounded-2xl bg-surface-container-low shadow-sm flex flex-col items-center justify-center gap-space-sm h-full min-h-[600px] border border-dashed border-surface-container-highest">
              <span className="material-symbols-outlined text-[64px] text-outline">description</span>
              <p className="font-body-md text-outline">Pilih dokumen dari menu di sebelah kiri untuk membaca kontennya.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Quick Cheatsheet Banner (Floating) */}
      {isSnippetsVisible && (
        <div className="fixed bottom-space-lg left-1/2 -translate-x-1/2 ml-0 xl:ml-36 bg-surface-container-low/95 backdrop-blur shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-surface-container-highest rounded-full px-space-md py-2 flex items-center gap-space-md z-40 w-max max-w-[90vw] overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-space-xs shrink-0 border-r border-surface-container-highest pr-space-md">
            <span className="material-symbols-outlined text-[16px] text-secondary">terminal</span>
            <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface hidden sm:inline-block">Quick Cheatsheet Snippets</span>
          </div>
          <div className="flex items-center gap-space-md shrink-0">
            <code onClick={() => handleCopySnippet('git rebase -i HEAD~3')} className="font-mono text-[11px] text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high cursor-pointer px-2 py-1 rounded transition-colors" title="Klik untuk salin">git rebase -i HEAD~3</code>
            <code onClick={() => handleCopySnippet('go test -race ./... -count=1')} className="font-mono text-[11px] text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high cursor-pointer px-2 py-1 rounded transition-colors" title="Klik untuk salin">go test -race ./... -count=1</code>
            <code onClick={() => handleCopySnippet('docker exec -it postgres psql -U postgres')} className="font-mono text-[11px] text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high cursor-pointer px-2 py-1 rounded transition-colors" title="Klik untuk salin">docker exec -it postgres psql</code>
          </div>
          <button onClick={() => setIsSnippetsVisible(false)} className="shrink-0 ml-auto w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* EXTERNAL LINK MODAL */}
      {showExtModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-xl w-full shadow-2xl flex flex-col border border-surface-container-highest relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative">
              <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">add_link</span>
                Tautkan Dokumen Eksternal
              </h2>
              <button onClick={() => setShowExtModal(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateExtLink} className="space-y-4 relative">
              <div>
                <label className="block font-label-sm text-outline mb-1">Judul Dokumen</label>
                <input required value={extTitle} onChange={e => setExtTitle(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="Arsitektur Sistem v1..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-outline mb-1">Tipe Dokumen</label>
                  <select value={extType} onChange={e => setExtType(e.target.value)} className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface appearance-none">
                    <option>Google Docs</option>
                    <option>Google Sheets</option>
                    <option>Google Slides</option>
                    <option>Notion</option>
                    <option>Web Link</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-outline mb-1">Tags (Pisahkan koma)</label>
                  <input value={extTags} onChange={e => setExtTags(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="arsitektur, riset..." />
                </div>
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">URL Lengkap (https://...)</label>
                <input required value={extUrl} onChange={e => setExtUrl(e.target.value)} type="url" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface font-mono text-sm" placeholder="https://docs.google.com/..." />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowExtModal(false)} className="px-6 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md transition-colors">Batal</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-secondary text-on-secondary font-label-md font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Simpan Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOCAL NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-low p-space-lg rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col border border-surface-container-highest relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-6 relative">
              <h2 className="font-headline-sm text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">post_add</span>
                Buat Catatan Baru
              </h2>
              <button onClick={() => setShowNoteModal(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateNote} className="space-y-4 relative">
              <div>
                <label className="block font-label-sm text-outline mb-1">Judul Catatan</label>
                <input required value={noteTitle} onChange={e => setNoteTitle(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="Kesimpulan RFC 04..." />
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">Konten (Mendukung Text/Markdown)</label>
                <textarea required value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={8} className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface font-mono text-sm resize-none custom-scrollbar" placeholder="# Latar Belakang..."></textarea>
              </div>
              <div>
                <label className="block font-label-sm text-outline mb-1">Tags (Pisahkan koma)</label>
                <input value={noteTags} onChange={e => setNoteTags(e.target.value)} type="text" className="w-full bg-surface-container p-3 rounded-xl focus:outline-none focus:bg-surface-container-high text-on-surface" placeholder="catatan, sprint, id..." />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNoteModal(false)} className="px-6 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md transition-colors">Batal</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KnowledgeBase;
