import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';

// Google Identity Services type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const Login = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useGlobalState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Terminal Logs Animation State
  const [logs, setLogs] = useState<string[]>([]);
  const initialLogs = [
    '> INISIALISASI PROTOKOL OTENTIKASI...',
    '> Sambungan ke basis data terenkripsi: AKTIF.',
    '> INISIALISASI MODUL AUTENTIKASI LOKAL... AKTIF.',
    '> MENUNGGU INPUT KREDENSIAL DARI PENGGUNA.',
  ];

  useEffect(() => {
    let delay = 0;
    initialLogs.forEach((log) => {
      delay += 700;
      setTimeout(() => {
        setLogs((prev) => [...prev, log]);
      }, delay);
    });
  }, []);

  // ─── Google sign-in callback ───
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MEMVERIFIKASI TOKEN GOOGLE...']);

    try {
      const result: any = await authApi.googleAuth({ credential: response.credential });

      if (result.success) {
        const userData = result?.data?.user || result?.user;
        const token = result?.data?.token || result?.token;

        if (userData && typeof userData.is_onboarded !== 'undefined') {
          setUser(userData);
          if (token) setToken(token);

          if (result.isNewUser || !userData.is_onboarded) {
            setLogs(prev => [...prev, '> AKUN BARU TERDETEKSI. REDIRECT KE ONBOARDING...']);
            setTimeout(() => navigate('/onboarding'), 1000);
          } else {
            setIsSuccess(true);
            setLogs(prev => [...prev, '> AKSES DIIZINKAN. MEMUAT COMMAND DECK...']);
            setTimeout(() => navigate('/dashboard'), 1200);
          }
        } else {
          console.error('Payload user tidak valid dari server:', result);
          throw new Error('Respons server tidak valid. Data user tidak ditemukan.');
        }
      } else {
        throw new Error(result.message || 'Autentikasi Google gagal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Autentikasi Google gagal.');
      setLogs(prev => [...prev, `> [ERROR] ${err.message || 'Google auth failed'}`]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [setUser, setToken, navigate]);

  // ─── Load Google Identity Services ───
  useEffect(() => {
    if (document.getElementById('google-gsi-script-login')) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'google-gsi-script-login';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleCredentialResponse,
        });
        const btnEl = document.getElementById('google-login-btn');
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: 'filled_black',
            size: 'large',
            width: 360,
            text: 'signin_with',
            shape: 'pill',
          });
        }
      }
    };
    document.head.appendChild(script);
  }, [handleGoogleCredentialResponse]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    setLogs((prev) => [...prev, '> MENGOTENTIKASI KREDENSIAL...']);

    try {
      const response: any = await authApi.login({ email, password });
      
      if (response.success) {
        const userData = response?.data?.user || response?.user;
        const token = response?.data?.token || response?.token;
        
        if (userData && typeof userData.is_onboarded !== 'undefined') {
          setUser(userData);
          if (token) setToken(token);
          
          setIsSuccess(true);
          setLogs((prev) => [...prev, '> AKSES DIIZINKAN. MEMUAT COMMAND DECK...']);
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else {
          console.error('Payload user tidak valid dari server:', response);
          throw new Error('Respons server tidak valid.');
        }
      } else {
        throw new Error(response.message || 'ERR_AUTH: Autentikasi Gagal.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'ERR_AUTH: Email atau password tidak sesuai basis data.');
      setLogs((prev) => [...prev, `> [ERROR] ${err.message || 'Kredensial tidak valid.'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0b10] font-label-lg text-body-md">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(160,120,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(76,215,246,0.05)_0%,_transparent_50%)]" />
      
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

      {/* Terminal Window */}
      <div className="relative z-10 w-full max-w-lg mx-4 sm:mx-6 animate-terminal-appear">
        <div
          className="rounded-2xl border border-[rgba(160,120,255,0.3)] overflow-hidden bg-black/70 backdrop-blur-xl"
          style={{
            boxShadow: `
              0 0 60px rgba(160,120,255,0.1),
              0 25px 50px rgba(0,0,0,0.7),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          {/* Title Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(160,120,255,0.2)] bg-[rgba(18,19,25,0.8)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.4)]" />
            </div>
            <span className="font-label-md text-label-md text-[#958ea0] tracking-wider select-none">
              auth@ambis-command-deck:~ login
            </span>
            <div className="w-[52px]" />
          </div>

          <div className="p-6 sm:p-8">
            {/* Terminal Output */}
            <div className="space-y-1.5 mb-6 font-mono text-[12px] leading-relaxed max-h-36 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start">
                  <span className={
                    log.includes('ERROR') || log.includes('ERR_AUTH')
                      ? 'text-[#ff5f57]'
                      : log.includes('AKSES DIIZINKAN') || log.includes('MEMUAT') || log.includes('TERVERIFIKASI') || log.includes('BERHASIL')
                        ? 'text-[#28c840]'
                        : log.includes('MODUL AUTENTIKASI') || log.includes('MENUNGGU INPUT')
                          ? 'text-[#4cd7f6]'
                          : 'text-primary'
                  }>
                    {log}
                  </span>
                </div>
              ))}
              {!isSuccess && (
                <div className="flex items-center text-[#958ea0] animate-fade-in">
                  <span className="mr-1">{'>'}</span>
                  <span className="inline-block w-2 h-[15px] bg-primary animate-blink-cursor" />
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-lg bg-[rgba(255,95,87,0.1)] border border-[rgba(255,95,87,0.3)] text-[#ff5f57] font-label-sm tracking-wide">
                {errorMsg}
              </div>
            )}

            {/* ─── Login Form (Primary) ─── */}
            <form onSubmit={handleLogin} className="space-y-4 mb-5">
              {/* IDENTITAS / EMAIL */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">person</span>
                  IDENTITAS / EMAIL
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4cd7f6] font-mono font-bold text-[14px] select-none">@</span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usr_xxx@domain.com"
                    required
                    autoComplete="email"
                    className="w-full bg-[rgba(18,19,25,0.7)] border border-[rgba(76,215,246,0.2)] rounded-lg py-3 pl-10 pr-4 text-on-surface text-[14px] font-mono focus:outline-none focus:border-[rgba(76,215,246,0.6)] focus:ring-1 focus:ring-[rgba(76,215,246,0.3)] transition-all placeholder:text-[#958ea0]/50"
                    style={{ caretColor: '#4cd7f6' }}
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"
                    style={{ boxShadow: '0 0 14px rgba(76,215,246,0.1)' }} />
                </div>
              </div>

              {/* KODE AKSES / PASSWORD */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  KODE AKSES / PASSWORD
                  <span className="ml-auto text-[10px] font-normal text-[#28c840] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#28c840] inline-block animate-pulse" />
                    ENCRYPTED
                  </span>
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined text-[18px]">lock</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="operator_id"
                    required
                    autoComplete="current-password"
                    className="w-full bg-[rgba(18,19,25,0.7)] border border-[rgba(160,120,255,0.2)] rounded-lg py-3 pl-11 pr-12 text-on-surface text-[14px] font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-[#958ea0]/50"
                    style={{ caretColor: '#a078ff' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#958ea0] hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity"
                    style={{ boxShadow: '0 0 14px rgba(160,120,255,0.1)' }} />
                </div>
              </div>

              {/* Remember session */}
              <div className="flex items-center gap-3 py-0.5">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border border-[rgba(160,120,255,0.3)] bg-transparent checked:bg-primary checked:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none appearance-none cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-background after:rotate-45 after:-mt-0.5 after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2"
                />
                <label htmlFor="remember" className="text-[11px] tracking-wide text-[#958ea0] cursor-pointer hover:text-on-surface transition-colors font-mono">
                  Ingat sesi ini (Persistent Token)
                </label>
              </div>

              {/* Submit: Masuk ke Sistem */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                id="login-submit-btn"
                className="w-full relative group mt-1 overflow-hidden rounded-lg border border-[rgba(76,215,246,0.4)] bg-[rgba(76,215,246,0.07)] py-4 transition-all hover:bg-[rgba(76,215,246,0.15)] focus:outline-none focus:ring-2 focus:ring-[rgba(76,215,246,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 0 20px rgba(76,215,246,0.12), inset 0 1px 0 rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-center gap-3 relative">
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[#4cd7f6]">autorenew</span>
                  ) : isSuccess ? (
                    <span className="material-symbols-outlined text-[#28c840]">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">login</span>
                  )}
                  <span className={`font-mono tracking-widest font-bold text-[13px] ${isSuccess ? 'text-[#28c840]' : 'text-[#4cd7f6]'}`}>
                    {isLoading ? 'AUTHENTICATING...' : isSuccess ? 'ACCESS GRANTED' : '[ MASUK KE SISTEM ]'}
                  </span>
                </div>
              </button>
            </form>

            {/* ─── Divider: External Gateway ─── */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-px bg-[rgba(160,120,255,0.15)]" />
              <span className="font-mono text-[#958ea0] tracking-wider uppercase text-[9px] whitespace-nowrap">
                ─── ATAU OTENTIKASI VIA GATEWAY EKSTERNAL ───
              </span>
              <div className="flex-1 h-px bg-[rgba(160,120,255,0.15)]" />
            </div>

            {/* ─── Google OAuth (Secondary) ─── */}
            <div className="flex flex-col items-center gap-3">
              <div id="google-login-btn" className="flex items-center justify-center min-h-[44px]" />
              {isGoogleLoading && (
                <div className="flex items-center gap-2 text-primary font-mono text-[12px]">
                  <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                  Memverifikasi identitas Google...
                </div>
              )}
            </div>
          </div>
          
          {/* ─── Security Footer ─── */}
          <div className="px-6 sm:px-8 py-4 border-t border-[rgba(160,120,255,0.1)] bg-[rgba(18,19,25,0.7)]">
            <div className="space-y-1.5 mb-4">
              <p className="font-mono text-[11px] text-[#958ea0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[13px] text-[#28c840]">shield</span>
                Password dienkripsi menggunakan hashing kelas militer (Bcrypt/Argon2)
              </p>
              <p className="font-mono text-[11px] text-[#958ea0] flex items-center gap-2">
                <span className="material-symbols-outlined text-[13px] text-[#28c840]">verified_user</span>
                Koneksi aman via TLS 1.3 — data tidak pernah disimpan plaintext
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => navigate('/')}
                className="text-[11px] text-[#958ea0] hover:text-on-surface transition-colors focus:outline-none flex items-center gap-1 font-mono"
              >
                <span className="text-[14px]">←</span> Kembali ke Gateway Utama
              </button>
              <button
                onClick={() => navigate('/register')}
                className="text-[11px] text-primary hover:text-[#d0bcff] transition-colors focus:outline-none font-bold tracking-wider font-mono"
              >
                Belum terdaftar? [ DAFTAR IDENTITAS BARU ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
