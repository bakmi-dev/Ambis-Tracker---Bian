import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';

// ─── Google Identity Services type ───
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

// ─── Role track options ───
const ROLE_TRACKS = [
  { id: 'software_engineer', label: 'Software Engineer / AI Builder', icon: 'code', color: 'primary' },
  { id: 'academic_researcher', label: 'Academic Researcher', icon: 'science', color: 'secondary' },
  { id: 'competitive_programmer', label: 'Competitive Programmer', icon: 'trophy', color: 'tertiary' },
  { id: 'product_architect', label: 'Product Architect', icon: 'architecture', color: 'primary' },
] as const;

type AuthStep = 'google_signin' | 'onboarding';

const Register = () => {
  const navigate = useNavigate();
  const { user, setUser, setToken } = useGlobalState();

  // ─── Step state ───
  const [step, setStep] = useState<AuthStep>('google_signin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ─── Verified Google data ───
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedAvatar, setVerifiedAvatar] = useState('');

  // ─── Onboarding form ───
  const [displayName, setDisplayName] = useState('');
  const [roleTrack, setRoleTrack] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [focusTarget, setFocusTarget] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ─── Terminal logs ───
  const [logs, setLogs] = useState<string[]>([]);

  // Initial logs
  useEffect(() => {
    const initialLogs = [
      '> INISIALISASI MODUL REGISTRASI...',
      '> Sambungan ke gateway Google OAuth: AKTIF.',
      '> Verifikasi identitas email diperlukan untuk membuat akun.',
    ];
    let delay = 0;
    initialLogs.forEach((log) => {
      delay += 600;
      setTimeout(() => setLogs(prev => [...prev, log]), delay);
    });
  }, []);

  // If user is already logged in and onboarded, go to dashboard
  useEffect(() => {
    if (user && user.is_onboarded) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // ─── Google Identity Services callback ───
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MEMVERIFIKASI TOKEN GOOGLE...']);

    try {
      const result = await authApi.googleAuth({ credential: response.credential });

      if (result.success && result.data) {
        const { user: userData, token } = result.data;
        setUser(userData);
        setToken(token);

        if (result.isNewUser || !userData.is_onboarded) {
          // New user → go to onboarding step
          setVerifiedEmail(userData.email);
          setVerifiedName(userData.name);
          setVerifiedAvatar(userData.avatar_url || '');
          setDisplayName(userData.name);
          setWorkspaceName(`${userData.name}'s Command Deck`);
          
          setLogs(prev => [
            ...prev,
            `> IDENTITAS EMAIL TERVERIFIKASI: ${userData.email}`,
            '> MENGALOKASIKAN RUANG PENYIMPANAN PRIBADI DI NEON POSTGRESQL...',
            '> Lengkapi konfigurasi operator kognitif Anda:',
          ]);
          setStep('onboarding');
        } else {
          // Returning user → dashboard
          setLogs(prev => [...prev, `> SELAMAT DATANG KEMBALI, ${userData.name.toUpperCase()}.`, '> MEMUAT COMMAND DECK...']);
          setTimeout(() => navigate('/dashboard'), 1200);
        }
      } else {
        throw new Error(result.message || 'Autentikasi Google gagal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Autentikasi Google gagal.');
      setLogs(prev => [...prev, `> [ERROR] ${err.message || 'Google auth failed'}`]);
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setToken, navigate]);

  // ─── Load Google Identity Services script ───
  useEffect(() => {
    // Prevent re-init if already loaded
    if (document.getElementById('google-gsi-script')) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'google-gsi-script';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleCredentialResponse,
        });
        const btnEl = document.getElementById('google-signin-btn');
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: 'filled_black',
            size: 'large',
            width: 360,
            text: 'signup_with',
            shape: 'pill',
          });
        }
      }
    };
    document.head.appendChild(script);
  }, [handleGoogleCredentialResponse]);

  // ─── Handle onboarding submit ───
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MENGINISIALISASI WORKSPACE...']);

    try {
      const result = await authApi.completeOnboarding({
        name: displayName,
        role_track: roleTrack,
        workspace_name: workspaceName || `${displayName}'s Command Deck`,
        focus_target_hours: focusTarget,
      });

      if (result.success && result.data) {
        setUser(result.data.user);
        setIsSuccess(true);
        setLogs(prev => [
          ...prev,
          '> WORKSPACE BERHASIL DIALOKASIKAN.',
          '> KONFIGURASI OPERATOR KOGNITIF: SELESAI.',
          '> MEMUAT COMMAND DECK...',
        ]);
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        throw new Error(result.message || 'Onboarding gagal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyelesaikan onboarding.');
      setLogs(prev => [...prev, `> [ERROR] ${err.message || 'Onboarding failed'}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0b10] font-label-lg text-body-md">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(160,120,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(76,215,246,0.05)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(208,188,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(208,188,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 w-full max-w-xl mx-4 sm:mx-6 animate-terminal-appear">
        <div className="rounded-2xl border border-[rgba(76,215,246,0.3)] overflow-hidden bg-black/70 backdrop-blur-xl" style={{
          boxShadow: '0 0 60px rgba(76,215,246,0.08), 0 25px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          {/* Title Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(76,215,246,0.2)] bg-[rgba(18,19,25,0.8)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.4)]" />
            </div>
            <span className="font-label-md text-label-md text-[#958ea0] tracking-wider select-none">
              auth@ambis-command-deck:~ {step === 'google_signin' ? 'register' : 'onboarding'}
            </span>
            <div className="w-[52px]" />
          </div>

          <div className="p-6 sm:p-8">
            {/* Terminal Output */}
            <div className="space-y-1.5 mb-6 font-label-lg text-[13px] leading-relaxed max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>
                  <span className={
                    log.includes('ERROR') ? 'text-[#ff5f57]' :
                    log.includes('TERVERIFIKASI') || log.includes('SELESAI') || log.includes('BERHASIL') ? 'text-[#28c840]' :
                    log.includes('MEMUAT') ? 'text-[#28c840]' :
                    'text-secondary'
                  }>{log}</span>
                </div>
              ))}
              {!isSuccess && (
                <div className="flex items-center text-[#958ea0]">
                  <span className="mr-2">{'>'}</span>
                  <span className="inline-block w-2 h-[15px] bg-secondary animate-blink-cursor" />
                </div>
              )}
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-lg bg-[rgba(255,95,87,0.1)] border border-[rgba(255,95,87,0.3)] text-[#ff5f57] font-label-sm tracking-wide">
                {errorMsg}
              </div>
            )}

            {/* ─── Step 1: Google Sign-In ─── */}
            {step === 'google_signin' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(76,215,246,0.1)] border border-[rgba(76,215,246,0.2)] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(76,215,246,0.15)]">
                    <span className="material-symbols-outlined text-secondary text-[28px]">person_add</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Daftar Identitas Baru</h2>
                  <p className="font-body-sm text-body-sm text-[#958ea0] max-w-sm mx-auto">
                    Gunakan akun Google untuk memverifikasi identitas dan mengalokasikan database pribadi Anda.
                  </p>
                </div>

                {/* Google Sign-In Button */}
                <div className="flex flex-col items-center gap-4">
                  <div id="google-signin-btn" className="flex items-center justify-center min-h-[44px]" />
                  
                  {isLoading && (
                    <div className="flex items-center gap-2 text-secondary font-label-sm">
                      <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                      Memverifikasi identitas Google...
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[rgba(76,215,246,0.15)]" />
                  <span className="font-label-sm text-[#958ea0] tracking-wider uppercase text-[10px]">Keamanan</span>
                  <div className="flex-1 h-px bg-[rgba(76,215,246,0.15)]" />
                </div>

                <div className="space-y-2 text-center">
                  <p className="font-label-sm text-label-sm text-[#958ea0] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#28c840]">verified</span>
                    Hanya email terverifikasi oleh Google yang diterima.
                  </p>
                  <p className="font-label-sm text-label-sm text-[#958ea0] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#28c840]">lock</span>
                    Password tidak disimpan — autentikasi sepenuhnya via Google.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Step 2: Onboarding Form ─── */}
            {step === 'onboarding' && (
              <div className="animate-fade-in">
                {/* User identity badge */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-[rgba(40,200,64,0.06)] border border-[rgba(40,200,64,0.15)]">
                  {verifiedAvatar ? (
                    <img src={verifiedAvatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-[rgba(40,200,64,0.3)]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold">
                      {verifiedName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-body-sm text-on-surface font-semibold">{verifiedName}</div>
                    <div className="font-label-sm text-label-sm text-[#28c840] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      {verifiedEmail}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase tracking-wider text-[#958ea0] font-bold">Display Name / Nickname</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[18px]">badge</span>
                      <input
                        type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nama tampilan Anda"
                        required
                        className="w-full bg-[rgba(18,19,25,0.6)] border border-[rgba(76,215,246,0.2)] rounded-lg py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-[#958ea0]/50"
                      />
                    </div>
                  </div>

                  {/* Primary Track / Persona */}
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase tracking-wider text-[#958ea0] font-bold">Primary Track / Persona</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_TRACKS.map((track) => (
                        <button
                          key={track.id} type="button"
                          onClick={() => setRoleTrack(track.id)}
                          className={`relative text-left p-3 rounded-lg border transition-all text-[12px] leading-tight focus:outline-none ${
                            roleTrack === track.id
                              ? 'border-secondary bg-[rgba(76,215,246,0.1)] text-on-surface'
                              : 'border-[rgba(76,215,246,0.1)] bg-[rgba(18,19,25,0.4)] text-[#958ea0] hover:border-[rgba(76,215,246,0.25)] hover:text-on-surface-variant'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] mb-1 block ${roleTrack === track.id ? 'text-secondary' : 'text-[#958ea0]'}`}>
                            {track.icon}
                          </span>
                          {track.label}
                          {roleTrack === track.id && (
                            <span className="absolute top-2 right-2 material-symbols-outlined text-secondary text-[14px]">check_circle</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workspace Name */}
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase tracking-wider text-[#958ea0] font-bold">Default Workspace Name</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[18px]">terminal</span>
                      <input
                        type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder={`${displayName || 'User'}'s Command Deck`}
                        className="w-full bg-[rgba(18,19,25,0.6)] border border-[rgba(76,215,246,0.2)] rounded-lg py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-[#958ea0]/50"
                      />
                    </div>
                  </div>

                  {/* Focus Target */}
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase tracking-wider text-[#958ea0] font-bold">Focus Target Harian</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={1} max={12} value={focusTarget}
                        onChange={(e) => setFocusTarget(Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none bg-[rgba(76,215,246,0.15)] accent-secondary cursor-pointer"
                      />
                      <div className="min-w-[72px] text-center px-3 py-1.5 rounded-lg bg-[rgba(76,215,246,0.1)] border border-[rgba(76,215,246,0.2)]">
                        <span className="text-secondary font-bold font-label-lg">{focusTarget}</span>
                        <span className="text-[#958ea0] text-[11px] ml-1">jam</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isSuccess || !displayName}
                    className="w-full relative group mt-4 overflow-hidden rounded-lg border border-[rgba(76,215,246,0.5)] bg-[rgba(76,215,246,0.1)] py-4 transition-all hover:bg-[rgba(76,215,246,0.2)] focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 0 20px rgba(76,215,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <span className="material-symbols-outlined animate-spin text-secondary">autorenew</span>
                      ) : isSuccess ? (
                        <span className="material-symbols-outlined text-[#28c840]">check_circle</span>
                      ) : null}
                      <span className={`font-label-lg tracking-wider font-bold ${isSuccess ? 'text-[#28c840]' : 'text-secondary'}`}>
                        {isSubmitting ? 'INITIALIZING...' : isSuccess ? 'WORKSPACE ACTIVATED' : '[ 01 // INITIALIZE_WORKSPACE ]'}
                      </span>
                    </div>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-4 border-t border-[rgba(76,215,246,0.1)] bg-[rgba(18,19,25,0.6)] gap-3">
            <button onClick={() => navigate('/')} className="text-[12px] text-[#958ea0] hover:text-on-surface transition-colors focus:outline-none flex items-center gap-1">
              <span className="text-[14px]">←</span> Kembali ke Gateway Utama
            </button>
            <button onClick={() => navigate('/login')} className="text-[12px] text-primary hover:text-[#d0bcff] transition-colors focus:outline-none font-bold tracking-wider">
              Sudah punya akun? [ 01 // MASUK ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
