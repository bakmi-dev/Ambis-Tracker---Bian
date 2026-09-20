
const AskAmbisAI = () => {
  return (
    <div className="flex flex-col h-full bg-surface-container-low rounded-xl border border-surface-container-highest shadow-sm">
      <div className="p-space-md border-b border-surface-container-highest flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_12px_rgba(208,188,255,0.3)]">
            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">Ask Ambis AI</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Asisten kognitif untuk memecahkan blokade teknismu.</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-secondary-container/20 text-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider animate-pulse">
          Online
        </span>
      </div>
      <div className="flex-1 p-space-lg flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-outline text-[64px] mb-4">forum</span>
        <h2 className="font-headline-sm text-on-surface font-bold">Modul AI Belum Tersedia</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-md">
          Fitur ini sedang dalam tahap pengembangan (WIP). Segera hadir untuk membantu kamu menganalisis jurnal, target, dan coding secara komprehensif.
        </p>
      </div>
    </div>
  );
};

export default AskAmbisAI;
