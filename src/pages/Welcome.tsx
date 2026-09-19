import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Typing animation line data ───
interface TerminalLine {
  text: string;
  delay: number;
  color?: string;
}

const TERMINAL_LINES: TerminalLine[] = [
  { text: '> Inisialisasi Ambis Tracker v3.2...', delay: 0, color: '#4cd7f6' },
  { text: '> Sistem fokus kognitif siap.', delay: 1800, color: '#d0bcff' },
  { text: '> Otentikasi identitas diperlukan untuk memuat workspace pribadi Anda.', delay: 3400, color: '#cbc3d7' },
];

// ─── Typing hook ───
function useTypingEffect(lines: TerminalLine[]) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; color?: string; complete: boolean }[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    lines.forEach((line, lineIndex) => {
      // Start line after its delay
      const startTimer = setTimeout(() => {
        setDisplayedLines(prev => {
          const next = [...prev];
          next[lineIndex] = { text: '', color: line.color, complete: false };
          return next;
        });

        // Type each character one by one
        const chars = line.text.split('');
        chars.forEach((char, charIndex) => {
          const charTimer = setTimeout(() => {
            setDisplayedLines(prev => {
              const next = [...prev];
              if (next[lineIndex]) {
                next[lineIndex] = {
                  ...next[lineIndex],
                  text: next[lineIndex].text + char,
                  complete: charIndex === chars.length - 1,
                };
              }
              return next;
            });
          }, charIndex * 28);
          timers.push(charTimer);
        });
      }, line.delay);

      timers.push(startTimer);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return displayedLines;
}

// ─── Floating particle component ───
const FloatingParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.id % 3 === 0 ? '#a078ff' : p.id % 3 === 1 ? '#4cd7f6' : '#f751a1',
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
};

// ─── Main Welcome Page ───
const Welcome = () => {
  const navigate = useNavigate();
  const displayedLines = useTypingEffect(TERMINAL_LINES);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<'login' | 'register' | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // Show cards after typing finishes
  useEffect(() => {
    const totalTypingTime = 3400 + '> Otentikasi identitas diperlukan untuk memuat workspace pribadi Anda.'.length * 28 + 400;
    const timer = setTimeout(() => setCardsVisible(true), totalTypingTime);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === '1') {
      setPressedKey('1');
      setTimeout(() => navigate('/login'), 300);
    } else if (e.key === '2') {
      setPressedKey('2');
      setTimeout(() => navigate('/register'), 300);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="welcome-page min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0b10]">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(160,120,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(76,215,246,0.05)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(247,81,161,0.04)_0%,_transparent_50%)]" />
      
      {/* Grid scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(208,188,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(208,188,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      <FloatingParticles />

      {/* Terminal Container */}
      <div className="relative z-10 w-full max-w-[720px] mx-4 sm:mx-6 animate-terminal-appear">
        {/* Terminal Window */}
        <div
          className="rounded-2xl border border-[rgba(160,120,255,0.15)] overflow-hidden"
          style={{
            background: 'rgba(13,14,20,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Title Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(160,120,255,0.1)] bg-[rgba(18,19,25,0.6)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.4)]" />
            </div>
            <span className="font-label-lg text-label-md text-[#958ea0] tracking-wider select-none">
              ambis-terminal --active-session
            </span>
            <div className="w-[52px]" /> {/* Spacer for centering */}
          </div>

          {/* Terminal Body */}
          <div className="p-5 sm:p-7">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Ambis Tracker Logo" className="w-10 h-10 object-contain rounded-xl" />
              <div>
                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight leading-none">
                  Ambis Tracker
                </h1>
                <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">
                  Command Terminal v3.2
                </span>
              </div>
            </div>

            {/* Terminal Lines */}
            <div className="space-y-2 mb-8 min-h-[88px]">
              {displayedLines.map((line, i) => (
                <div key={i} className="flex items-start font-label-lg text-[13px] leading-relaxed">
                  <span style={{ color: line.color || '#cbc3d7' }}>
                    {line.text}
                  </span>
                  {!line.complete && (
                    <span className="inline-block w-[2px] h-[15px] ml-0.5 mt-[2px] bg-primary animate-blink-cursor" />
                  )}
                </div>
              ))}
              {/* Static blinking cursor after all lines */}
              {displayedLines.length === TERMINAL_LINES.length &&
                displayedLines.every(l => l.complete) && (
                  <div className="flex items-center font-label-lg text-[13px] text-[#958ea0] animate-fade-in">
                    <span className="mr-1">{'>'}</span>
                    <span className="inline-block w-[2px] h-[15px] bg-primary animate-blink-cursor" />
                  </div>
                )}
            </div>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(160,120,255,0.2)] to-transparent mb-7" />

            {/* Action Cards */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-700 ease-out ${
                cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {/* Card 1: Login */}
              <button
                id="welcome-login-card"
                onClick={() => navigate('/login')}
                onMouseEnter={() => setHoveredCard('login')}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative text-left rounded-xl p-5 border transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/60 ${
                  pressedKey === '1'
                    ? 'border-primary bg-[rgba(160,120,255,0.15)] scale-[0.97]'
                    : hoveredCard === 'login'
                    ? 'border-[rgba(160,120,255,0.4)] bg-[rgba(160,120,255,0.06)]'
                    : 'border-[rgba(160,120,255,0.1)] bg-[rgba(18,19,25,0.5)]'
                }`}
                style={{
                  boxShadow: hoveredCard === 'login' || pressedKey === '1'
                    ? '0 0 30px rgba(160,120,255,0.12), inset 0 1px 0 rgba(255,255,255,0.03)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${
                    hoveredCard === 'login' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(160,120,255,0.08) 0%, transparent 70%)',
                  }}
                />
                
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(160,120,255,0.12)] flex items-center justify-center group-hover:bg-[rgba(160,120,255,0.2)] transition-colors">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        key
                      </span>
                    </div>
                    <span className="font-label-lg text-label-lg text-primary tracking-wider">
                      [ 01 // MASUK ]
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                    Akses Command Deck Anda yang sudah ada
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-[#958ea0] tracking-wider uppercase opacity-70">
                      Login → Workspace
                    </span>
                    <kbd className="px-2 py-0.5 rounded bg-[rgba(160,120,255,0.1)] border border-[rgba(160,120,255,0.2)] font-label-lg text-label-sm text-primary">
                      1
                    </kbd>
                  </div>
                </div>
              </button>

              {/* Card 2: Register */}
              <button
                id="welcome-register-card"
                onClick={() => navigate('/register')}
                onMouseEnter={() => setHoveredCard('register')}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group relative text-left rounded-xl p-5 border transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/60 ${
                  pressedKey === '2'
                    ? 'border-secondary bg-[rgba(76,215,246,0.15)] scale-[0.97]'
                    : hoveredCard === 'register'
                    ? 'border-[rgba(76,215,246,0.4)] bg-[rgba(76,215,246,0.06)]'
                    : 'border-[rgba(76,215,246,0.1)] bg-[rgba(18,19,25,0.5)]'
                }`}
                style={{
                  boxShadow: hoveredCard === 'register' || pressedKey === '2'
                    ? '0 0 30px rgba(76,215,246,0.12), inset 0 1px 0 rgba(255,255,255,0.03)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${
                    hoveredCard === 'register' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(76,215,246,0.08) 0%, transparent 70%)',
                  }}
                />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(76,215,246,0.12)] flex items-center justify-center group-hover:bg-[rgba(76,215,246,0.2)] transition-colors">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        person_add
                      </span>
                    </div>
                    <span className="font-label-lg text-label-lg text-secondary tracking-wider">
                      [ 02 // REGISTRASI ]
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                    Buat identitas dan alokasikan database pribadi baru
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-[#958ea0] tracking-wider uppercase opacity-70">
                      Register → New Profile
                    </span>
                    <kbd className="px-2 py-0.5 rounded bg-[rgba(76,215,246,0.1)] border border-[rgba(76,215,246,0.2)] font-label-lg text-label-sm text-secondary">
                      2
                    </kbd>
                  </div>
                </div>
              </button>
            </div>

            {/* Footer hint */}
            <div
              className={`mt-6 text-center transition-all duration-700 delay-300 ${
                cardsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="font-label-sm text-label-sm text-[#958ea0] tracking-wider">
                <span className="material-symbols-outlined text-[12px] align-middle mr-1 text-[#958ea0]">keyboard</span>
                Tekan{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-[rgba(160,120,255,0.08)] border border-[rgba(160,120,255,0.15)] text-primary mx-0.5">1</kbd>
                {' '}atau{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-[rgba(76,215,246,0.08)] border border-[rgba(76,215,246,0.15)] text-secondary mx-0.5">2</kbd>
                {' '}untuk navigasi cepat
              </p>
            </div>
          </div>
        </div>

        {/* Bottom decorative status bar */}
        <div
          className={`mt-4 flex items-center justify-between px-4 transition-all duration-700 delay-500 ${
            cardsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.5)] animate-pulse" />
            <span className="font-label-sm text-label-sm text-[#958ea0] tracking-wider">
              SYSTEM ONLINE
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-[#958ea0] tracking-wider opacity-60">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
