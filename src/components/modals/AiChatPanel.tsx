import React, { useState, useRef, useEffect } from 'react';
import { useGlobalState } from '../../context/GlobalContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  "⚡ Prioritaskan task hari ini",
  "🎯 Evaluasi target mingguan",
  "⏱️ Buat jadwal Pomodoro",
  "💡 Rekomendasi bimbel & materi"
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'ai',
    text: "Halo Operator! Ambis AI siap mendampingi perjalanan belajarmu. Mau breakdown task, optimasi jadwal fokus, atau konsultasi strategi ambisimu hari ini?",
    time: "ONLINE"
  }
];

const AiChatPanel: React.FC = () => {
  const { isAiChatOpen, setIsAiChatOpen, user } = useGlobalState();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAiChatOpen) {
      inputRef.current?.focus();
    }
  }, [isAiChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "Instruksi diterima, Operator. ";
      const lower = text.toLowerCase();

      if (lower.includes("prioritas") || lower.includes("task")) {
        replyText = "Berdasarkan analisis log tugasmu, fokuskan energi pada 1 task High-Impact di sesi pagi (Deep Work 90 menit). Selesaikan tugas administrasi kecil di sore hari.";
      } else if (lower.includes("pomodoro") || lower.includes("jadwal")) {
        replyText = "Rekomendasi siklus: 45 menit fokus penuh (mode Binaural Alpha aktif), lalu 10 menit istirahat aktif tanpa distraksi layar. Ulangi 3 siklus untuk hasil maksimal.";
      } else if (lower.includes("bimbel") || lower.includes("materi")) {
        replyText = "Cek bagian 'Rekomendasi Bimbel' di Dashboard! Kamu bisa meninjau Akademi Belajar Quantum untuk penguatan materi esensial atau Pionir Logika untuk persiapan kompetisi.";
      } else if (lower.includes("evaluasi") || lower.includes("target")) {
        replyText = `Target mingguanmu berjalan stabil, ${user?.name || 'Operator'}. Pertahankan momentum streak dan pastikan mencatat refleksi harian di modul Journal.`;
      } else {
        replyText = `Analisis kognitif untuk "${text}" selesai. Langkah berikutnya: pecah menjadi 2 subtugas terukur dan mulai timer fokus 25 menit sekarang. Kamu pasti bisa!`;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile & click outside */}
      {isAiChatOpen && (
        <div 
          onClick={() => setIsAiChatOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <div
        className={`fixed left-0 md:left-72 top-0 h-screen w-full md:w-96 bg-surface-container-lowest border-r border-neutral-800 z-40 flex flex-col shadow-2xl transition-all duration-300 transform ${
          isAiChatOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Terminal AI Header */}
        <div className="p-4 border-b border-neutral-800 bg-surface-container-lowest flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[19px]">smart_toy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-on-surface">Ambis AI</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ONLINE
                </span>
              </div>
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                NEURAL ASSISTANT // V1.2
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAiChatOpen(false)}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer border border-neutral-800"
            title="Tutup Panel AI"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-surface-container-low/40 border-b border-neutral-800/60 overflow-x-auto no-scrollbar flex items-center gap-2 flex-shrink-0">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-mono whitespace-nowrap px-2.5 py-1 rounded-md bg-surface-container border border-neutral-700/60 text-on-surface-variant hover:text-white hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                  {msg.sender === 'user' ? (user?.name || 'OPERATOR') : 'AMBIS_CORE'}
                </span>
                <span className="font-mono text-[9px] text-outline/60">
                  {msg.time}
                </span>
              </div>

              <div
                className={`max-w-[88%] p-3 rounded-xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-neutral-800 text-white border border-neutral-700 rounded-br-xs'
                    : 'bg-surface-container-low text-on-surface border border-neutral-800/80 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="font-mono text-[10px] uppercase text-outline mb-1 px-1">
                AMBIS_CORE // PROCESSING...
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-neutral-800/80 text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.3s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-surface-container-lowest border-t border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2 bg-surface-container-low border border-neutral-800 rounded-xl p-1.5 focus-within:border-cyan-500/50 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya atau minta bantuan AI..."
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Kirim</span>
              <span className="material-symbols-outlined text-[14px]">send</span>
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="font-mono text-[9px] text-outline">Tekan [Enter] untuk mengirim</span>
            <span className="font-mono text-[9px] text-cyan-400 font-medium">Ambis AI Engine</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default AiChatPanel;
