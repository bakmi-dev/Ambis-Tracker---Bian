import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useGlobalState } from '../context/GlobalContext';
import Avatar from '../components/common/Avatar';

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
  { id: 'academic_competitive', label: 'Academic & Competitive Student', icon: 'science', color: 'secondary' },
  { id: 'product_architect', label: 'Product Architect / Tech Enthusiast', icon: 'architecture', color: 'primary' },
  { id: 'creative_strategist', label: 'Creative Strategist / General Ambis', icon: 'brush', color: 'tertiary' },
  { id: 'custom', label: 'Custom / Isi Sendiri', icon: 'terminal', color: 'secondary' },
] as const;

type AuthStep = 'google_signin' | 'onboarding' | 'email_register';

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

  // ─── Email/Password registration state ───
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // ─── Onboarding form ───
  const [displayName, setDisplayName] = useState(user?.name ? user.name.split(' ')[0] : '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [roleTrack, setRoleTrack] = useState('');
  const [customRoleTrack, setCustomRoleTrack] = useState('');
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
      '> INISIALISASI MODUL AUTENTIKASI LOKAL... AKTIF.',
      '> Pilih metode pendaftaran identitas operator.',
    ];
    let delay = 0;
    initialLogs.forEach((log) => {
      delay += 600;
      setTimeout(() => setLogs(prev => [...prev, log]), delay);
    });
  }, []);

  // Do not automatically redirect on mount to allow manual logout or registration
  // if the user has stale data.
  // useEffect(() => {
  //   if (user && user.is_onboarded) {
  //     navigate('/dashboard');
  //   }
  // }, [user, navigate]);

  // ─── Handle Email/Password Registration ───
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword !== confirmPassword) {
      setErrorMsg('ERR_MISMATCH: Kode akses tidak cocok. Verifikasi ulang.');
      setLogs(prev => [...prev, '> [ERROR] Konfirmasi password tidak cocok.']);
      return;
    }
    if (registerPassword.length < 8) {
      setErrorMsg('ERR_WEAK_KEY: Kode akses minimal 8 karakter.');
      return;
    }
    setIsEmailLoading(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MENGENKRIPSI KODE AKSES (BCRYPT)...', '> MENDAFTARKAN IDENTITAS KE DATABASE...']);

    try {
      const result: any = await authApi.register({
        name: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      });

      if (result.success) {
        const userData = result?.data?.user || result?.user;
        const token = result?.data?.token || result?.token;

        if (userData) {
          setUser(userData);
          if (token) setToken(token);

          setLogs(prev => [
            ...prev,
            `> IDENTITAS TERDAFTAR: ${userData.email || registerEmail}`,
            `> Selamat datang, ${userData.name}!`,
            '> INISIALISASI SESI OPERATOR: BERHASIL.',
            '> OTORISASI COMMAND DECK DIBERIKAN.',
            '> MENGALIHKAN KE DASHBOARD...',
          ]);
          setTimeout(() => navigate('/dashboard'), 800);
        } else {
          throw new Error('Respons server tidak valid. Data user tidak ditemukan.');
        }
      } else {
        throw new Error(result.message || 'Registrasi gagal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ERR_REGISTER: Gagal mendaftarkan identitas.');
      setLogs(prev => [...prev, `> [ERROR] ${err.message || 'Registration failed'}`]);
    } finally {
      setIsEmailLoading(false);
    }
  };

  // ─── Google Identity Services callback ───
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MEMVERIFIKASI TOKEN GOOGLE...']);

    try {
      const result: any = await authApi.googleAuth({ credential: response.credential });

      if (result.success) {
        const userData = result?.data?.user || result?.user;
        const token = result?.data?.token || result?.token;

        if (userData) {
          setUser(userData);
          if (token) setToken(token);

          if (!userData.is_onboarded) {
            // New user without onboarding → go to onboarding step
            setVerifiedEmail(userData.email);
            setVerifiedName(userData.name);
            setVerifiedAvatar(userData.avatar_url || '');
            setAvatarUrl(userData.avatar_url || '');
            const firstName = userData.name ? userData.name.split(' ')[0] : 'Operator';
            setDisplayName(firstName);
            setWorkspaceName(`${firstName}'s Command Deck`);
            
            setLogs(prev => [
              ...prev,
              `> IDENTITAS EMAIL TERVERIFIKASI: ${userData.email}`,
              '> MENGALOKASIKAN RUANG PENYIMPANAN PRIBADI DI NEON POSTGRESQL...',
              '> Lengkapi konfigurasi operator kognitif Anda:',
            ]);
            setStep('onboarding');
          } else {
            // Returning / onboarded user → dashboard
            setLogs(prev => [...prev, `> SESI TERVALIDASI: ${(userData.name || 'OPERATOR').toUpperCase()}.`, '> MEMUAT COMMAND DECK...']);
            setTimeout(() => navigate('/dashboard'), 800);
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
    if (!displayName.trim()) {
      setErrorMsg('Display name is required');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    setLogs(prev => [...prev, '> MENGINISIALISASI WORKSPACE...']);

    try {
      const result: any = await authApi.completeOnboarding({
        name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
        role_track: roleTrack === 'custom' ? customRoleTrack : roleTrack,
        workspace_name: workspaceName.trim() || `${displayName.trim()}'s Command Deck`,
        focus_target_hours: focusTarget,
      });

      if (result.success) {
        const userData = result?.data?.user || result?.user || result?.data;
        if (userData && typeof userData.is_onboarded !== 'undefined') {
          setUser(userData);
          setIsSuccess(true);
          setLogs(prev => [
            ...prev,
            '> WORKSPACE BERHASIL DIALOKASIKAN.',
            '> KONFIGURASI OPERATOR KOGNITIF: SELESAI.',
            '> MEMUAT COMMAND DECK...',
          ]);
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          console.error('Payload user tidak valid dari server saat onboarding:', result);
          throw new Error('Respons server tidak valid.');
        }
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
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}>
          {/* Title Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(76,215,246,0.2)] bg-[rgba(18,19,25,0.8)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.4)]" />
            </div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Ambis Logo" className="w-4 h-4 object-contain" />
              <span className="font-label-md text-label-md text-[#958ea0] tracking-wider select-none">
                auth@ambis-command-deck:~ {step === 'google_signin' ? 'register' : 'onboarding'}
              </span>
            </div>
            <div className="w-[52px]" />
          </div>

          <div className="p-6 sm:p-8">
            {/* Terminal Output */}
            <div className="space-y-1.5 mb-6 font-label-lg text-[13px] leading-relaxed max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>
                  <span className={
                    log.includes('ERROR') || log.includes('ERR_') || log.includes('salah') ? 'text-[#ff5f57]' :
                    log.includes('TERVERIFIKASI') || log.includes('SELESAI') || log.includes('BERHASIL') || log.includes('Selamat datang') ? 'text-[#28c840]' :
                    log.includes('MEMUAT') || log.includes('TERDAFTAR') ? 'text-[#28c840]' :
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

            {/* ─── Step 1: Registration (Email or Google) ─── */}
            {step === 'google_signin' && (
              <div className="space-y-5 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(76,215,246,0.1)] border border-[rgba(76,215,246,0.2)] flex items-center justify-center shadow-[0_0_16px_rgba(76,215,246,0.12)] flex-shrink-0">
                    <span className="material-symbols-outlined text-secondary text-[24px]">person_add</span>
                  </div>
                  <div>
                    <h2 className="font-mono text-[15px] font-bold text-on-surface tracking-wide">DAFTAR IDENTITAS BARU</h2>
                    <p className="font-mono text-[11px] text-[#958ea0]">Alokasi akun operator baru ke sistem Ambis</p>
                  </div>
                </div>

                {/* ─── Email/Password Form ─── */}
                <form onSubmit={handleEmailRegister} className="space-y-3">
                  {/* Nama */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">badge</span>
                      NAMA OPERATOR
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#4cd7f6] text-[16px]">person</span>
                      <input
                        id="register-name"
                        type="text"
                        value={registerName}
                        onChange={(e) => { setRegisterName(e.target.value); if (errorMsg) setErrorMsg(''); }}
                        placeholder="Nama lengkap / panggilan"
                        required
                        autoComplete="name"
                        className="w-full bg-[rgba(18,19,25,0.7)] border border-[rgba(76,215,246,0.2)] rounded-lg py-2.5 pl-11 pr-4 text-on-surface text-[13px] font-mono focus:outline-none focus:border-[rgba(76,215,246,0.6)] focus:ring-1 focus:ring-[rgba(76,215,246,0.3)] transition-all placeholder:text-[#958ea0]/50"
                        style={{ caretColor: '#4cd7f6' }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">alternate_email</span>
                      IDENTITAS / EMAIL
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4cd7f6] font-mono font-bold text-[14px] select-none">@</span>
                      <input
                        id="register-email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => { setRegisterEmail(e.target.value); if (errorMsg) setErrorMsg(''); }}
                        placeholder="usr_xxx@domain.com"
                        required
                        autoComplete="email"
                        className="w-full bg-[rgba(18,19,25,0.7)] border border-[rgba(76,215,246,0.2)] rounded-lg py-2.5 pl-10 pr-4 text-on-surface text-[13px] font-mono focus:outline-none focus:border-[rgba(76,215,246,0.6)] focus:ring-1 focus:ring-[rgba(76,215,246,0.3)] transition-all placeholder:text-[#958ea0]/50"
                        style={{ caretColor: '#4cd7f6' }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">lock</span>
                      KODE AKSES / PASSWORD
                      <span className="ml-auto text-[10px] font-normal text-[#28c840] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#28c840] inline-block animate-pulse" />
                        BCRYPT
                      </span>
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary material-symbols-outlined text-[16px]">key</span>
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => { setRegisterPassword(e.target.value); if (errorMsg) setErrorMsg(''); }}
                        placeholder="Min. 8 karakter"
                        required
                        autoComplete="new-password"
                        className="w-full bg-[rgba(18,19,25,0.7)] border border-[rgba(160,120,255,0.2)] rounded-lg py-2.5 pl-11 pr-12 text-on-surface text-[13px] font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-[#958ea0]/50"
                        style={{ caretColor: '#a078ff' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#958ea0] hover:text-primary transition-colors focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-widest text-[#4cd7f6] font-bold font-mono flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">lock_reset</span>
                      KONFIRMASI KODE AKSES
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary material-symbols-outlined text-[16px]">key</span>
                      <input
                        id="register-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (errorMsg) setErrorMsg(''); }}
                        placeholder="Ulangi kode akses"
                        required
                        autoComplete="new-password"
                        className={`w-full bg-[rgba(18,19,25,0.7)] border rounded-lg py-2.5 pl-11 pr-12 text-on-surface text-[13px] font-mono focus:outline-none focus:ring-1 transition-all placeholder:text-[#958ea0]/50 ${
                          confirmPassword && confirmPassword !== registerPassword
                            ? 'border-[rgba(255,95,87,0.5)] focus:border-[rgba(255,95,87,0.7)] focus:ring-[rgba(255,95,87,0.3)]'
                            : confirmPassword && confirmPassword === registerPassword
                              ? 'border-[rgba(40,200,64,0.4)] focus:border-[rgba(40,200,64,0.6)] focus:ring-[rgba(40,200,64,0.3)]'
                              : 'border-[rgba(160,120,255,0.2)] focus:border-primary focus:ring-primary/30'
                        }`}
                        style={{ caretColor: '#a078ff' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#958ea0] hover:text-primary transition-colors focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      {/* Match indicator */}
                      {confirmPassword && (
                        <span className={`absolute right-10 top-1/2 -translate-y-1/2 material-symbols-outlined text-[14px] ${
                          confirmPassword === registerPassword ? 'text-[#28c840]' : 'text-[#ff5f57]'
                        }`}>
                          {confirmPassword === registerPassword ? 'check_circle' : 'cancel'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submit: Execute Registrasi */}
                  <button
                    type="submit"
                    disabled={isEmailLoading}
                    id="register-email-submit-btn"
                    className="w-full relative group overflow-hidden rounded-lg border border-[rgba(76,215,246,0.45)] bg-[rgba(76,215,246,0.08)] py-3.5 transition-all hover:bg-[rgba(76,215,246,0.16)] focus:outline-none focus:ring-2 focus:ring-[rgba(76,215,246,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 0 18px rgba(76,215,246,0.12), inset 0 1px 0 rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      {isEmailLoading ? (
                        <span className="material-symbols-outlined animate-spin text-[#4cd7f6]">autorenew</span>
                      ) : (
                        <span className="material-symbols-outlined text-[#4cd7f6] text-[17px]">person_add</span>
                      )}
                      <span className="font-mono tracking-widest font-bold text-[12px] text-[#4cd7f6]">
                        {isEmailLoading ? 'MENGALOKASIKAN...' : '[ EXECUTE // REGISTRASI IDENTITAS ]'}
                      </span>
                    </div>
                  </button>
                </form>

                {/* ─── Divider ─── */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[rgba(76,215,246,0.12)]" />
                  <span className="font-mono text-[#958ea0] tracking-wider uppercase text-[9px] whitespace-nowrap">
                    ─── ATAU OTENTIKASI VIA GATEWAY EKSTERNAL ───
                  </span>
                  <div className="flex-1 h-px bg-[rgba(76,215,246,0.12)]" />
                </div>

                {/* ─── Google OAuth (Secondary) ─── */}
                <div className="flex flex-col items-center gap-3">
                  <div id="google-signin-btn" className="flex items-center justify-center min-h-[44px]" />
                  {isLoading && (
                    <div className="flex items-center gap-2 text-secondary font-mono text-[12px]">
                      <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
                      Memverifikasi identitas Google...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Step 2: Onboarding Form ─── */}
            {step === 'onboarding' && (
              <div className="animate-fade-in">
                {/* User identity badge */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-[rgba(40,200,64,0.06)] border border-[rgba(40,200,64,0.15)]">
                  <Avatar src={avatarUrl || verifiedAvatar} name={displayName || verifiedName} size="md" />
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
                        type="text" value={displayName} onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Nama tampilan Anda"
                        required
                        className="w-full bg-[rgba(18,19,25,0.6)] border border-[rgba(76,215,246,0.2)] rounded-lg py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-[#958ea0]/50"
                      />
                    </div>
                  </div>

                  {/* Profile Photo URL */}
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase tracking-wider text-[#958ea0] font-bold">Profile Photo URL (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[18px]">link</span>
                      <input
                        type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://... (Biarkan kosong untuk fallback/Google)"
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
                    {roleTrack === 'custom' && (
                      <div className="relative mt-3 animate-fade-in">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[18px]">terminal</span>
                        <input
                          type="text" value={customRoleTrack} onChange={(e) => setCustomRoleTrack(e.target.value)}
                          placeholder="[ Tentukan Jalur / Ambisi Pribadi Anda ]"
                          required
                          className="w-full bg-[rgba(18,19,25,0.6)] border border-secondary/50 rounded-lg py-3 pl-11 pr-4 text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50 transition-all placeholder:text-[#958ea0]/50"
                        />
                      </div>
                    )}
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
          <div className="px-6 sm:px-8 py-4 border-t border-[rgba(76,215,246,0.1)] bg-[rgba(18,19,25,0.7)]">
            <div className="space-y-1.5 mb-3">
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
              <button onClick={() => navigate('/')} className="text-[11px] text-[#958ea0] hover:text-on-surface transition-colors focus:outline-none flex items-center gap-1 font-mono">
                <span className="text-[14px]">←</span> Kembali ke Gateway Utama
              </button>
              <button onClick={() => navigate('/login')} className="text-[11px] text-primary hover:text-[#d0bcff] transition-colors focus:outline-none font-bold tracking-wider font-mono">
                Sudah punya akun? [ MASUK KE SISTEM ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
