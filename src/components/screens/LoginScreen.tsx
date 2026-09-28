import React, { useRef, useState } from 'react';
import { User } from '../../types';
import { verifyPassword, hashPassword, isLoginLocked, getLockoutSecondsRemaining, recordFailedLoginAttempt, resetLoginThrottle, getLoginThrottle } from '../../utils/auth';
import { MAX_LOGIN_ATTEMPTS } from '../../utils/constants';
import { Owl } from '../Owl';
import { RippleButton } from '../RippleButton';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  allUsers: User[];
  onPasswordChanged?: (userId: string, newPassword: string) => void;
}

/** Half-diagonal (px) of the DIAMOND beam projected by the flashlight. */
const BEAM_REACH_PX = 90;
/** Extra slack so sweeping the beam over the owl's perch counts as a hit. */
const OWL_HIT_SLACK_PX = 30;
/** Monospaced advance width per character at text-sm (14px). */
const CHAR_WIDTH_PX = 8.4;
/** Left padding of the input text area (pl-10 = 40px, after the lock icon). */
const TEXT_START_PX = 40;

/** Beam position in VIEWPORT coordinates; null = flashlight not shining. */
interface BeamPoint {
  x: number;
  y: number;
}

/** Circular reveal strength: 1 in the core, fading to 0 at the glow edge. */
function beamIntensity(dx: number, dy: number): number {
  const d = Math.hypot(dx, dy);
  const core = BEAM_REACH_PX * 0.45;
  if (d <= core) return 1;
  if (d >= BEAM_REACH_PX) return 0;
  return 1 - (d - core) / (BEAM_REACH_PX - core);
}

/**
 * FlashlightBullets — the fake masked/revealed text rendered on top of the
 * real (text-transparent) password input while the flashlight is on.
 * The beam is a 2D spotlight: a character lights up when the beam point
 * (viewport coords) is within BEAM_RADIUS_PX of the character's center,
 * with a soft falloff — so the beam can sweep up/down across the field.
 */
const FlashlightBullets: React.FC<{
  password: string;
  beam: BeamPoint | null;
  fieldRect: DOMRect | null;
}> = ({ password, beam, fieldRect }) => {
  if (!fieldRect) return null;
  const bx = beam ? beam.x - fieldRect.left : null;
  const by = beam ? beam.y - fieldRect.top : null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center pl-10 overflow-hidden pointer-events-none font-mono text-sm tracking-[0.08em]"
    >
      {password.split('').map((c, i) => {
        const cx = TEXT_START_PX + i * CHAR_WIDTH_PX + CHAR_WIDTH_PX / 2;
        const cy = fieldRect.height / 2; // chars are vertically centered (h-11)
        const intensity = bx === null || by === null ? 0 : beamIntensity(cx - bx, cy - by);
        return (
          <span
            key={i}
            className="inline-block text-[#EFC14B]"
            style={{
              width: CHAR_WIDTH_PX,
              opacity: intensity,
              textShadow: intensity > 0.5 ? '0 0 8px rgba(255, 214, 112, 0.8)' : 'none',
              transition: 'opacity 120ms linear',
            }}
          >
            {intensity > 0.15 ? c : '•'}
          </span>
        );
      })}
    </div>
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, allUsers, onPasswordChanged }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // showPassword IS the flashlight switch. Default: the plain eye icon, day
  // theme, no owl. Turning it on swaps the icon to a flashlight, switches the
  // page to night mode and lets the owl appear (when the beam finds it).
  const [beam, setBeam] = useState<BeamPoint | null>(null);
  const nightMode = showPassword;
  const flashOn = showPassword;

  // Measure the password field, the owl's perch and the flashlight icon so
  // the beam can hit them. (Layout reads during render are fine at this scale.)
  const pwWrapRef = useRef<HTMLDivElement>(null);
  const owlWrapRef = useRef<HTMLSpanElement>(null);
  const flashBtnRef = useRef<HTMLButtonElement>(null);
  const pwRect = flashOn ? pwWrapRef.current?.getBoundingClientRect() ?? null : null;
  const owlRect = flashOn ? owlWrapRef.current?.getBoundingClientRect() ?? null : null;
  // The beam PROJECTS from the flashlight icon toward the pointer.
  const beamSource = flashOn
    ? (() => {
        const r = flashBtnRef.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      })()
    : null;
  // Circular hit test: the owl wakes when the glow reaches its perch.
  const owlLit =
    !!beam &&
    !!owlRect &&
    Math.hypot(
      beam.x - (owlRect.left + owlRect.width / 2),
      beam.y - (owlRect.top + owlRect.height / 2)
    ) <= BEAM_REACH_PX + OWL_HIT_SLACK_PX;
  const beamActive = flashOn && beam !== null;

  // Force password change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  // Countdown while locked out — re-renders each second so the message stays accurate
  const [, setLockoutTick] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Gate 0: brute-force lockout (checked BEFORE any verification) ──
    // Non-async and first on purpose: a locked session must not touch
    // password verification at all, and cannot fail with an exception.
    if (isLoginLocked()) {
      const minutes = Math.ceil(getLockoutSecondsRemaining() / 60);
      setErrorMsg(`Đã nhập sai quá ${MAX_LOGIN_ATTEMPTS} lần. Vui lòng thử lại sau ${minutes} phút.`);
      setLockoutTick(t => t + 1);
      return;
    }

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tài khoản hoặc mã nhân viên');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }

    // Find user by code or email
    const foundUser = allUsers.find(
      u => u.employeeCode.toLowerCase() === username.trim().toLowerCase() ||
           u.email.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundUser) {
      setErrorMsg('Tài khoản không tồn tại trong hệ thống');
      recordFailedLoginAttempt();
      return;
    }

    // SECURITY FIX: Verify password using SHA-256 hash instead of plaintext comparison
    // This prevents password exposure in localStorage and DevTools
    const storedHash = foundUser.password || '';
    const passwordValid = await verifyPassword(password, storedHash);

    if (!passwordValid) {
      recordFailedLoginAttempt();
      const { failedAttempts, lockedUntil } = getLoginThrottle();
      if (lockedUntil) {
        const minutes = Math.ceil((lockedUntil - Date.now()) / 60000);
        setErrorMsg(`Đã nhập sai quá ${MAX_LOGIN_ATTEMPTS} lần. Vui lòng thử lại sau ${minutes} phút.`);
      } else {
        const left = Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts);
        setErrorMsg(`Mật khẩu không đúng. Còn ${left} lần thử.`);
      }
      return;
    }

    // ── Account deactivated → block AFTER password verification ──
    // Order matters: rejecting a deactivated account before the password
    // check would leak account status to anyone guessing emails.
    if (foundUser.isAccountActive === false) {
      recordFailedLoginAttempt();
      setErrorMsg('Tài khoản đã bị vô hiệu hóa. Liên hệ quản lý để được hỗ trợ.');
      return;
    }

    resetLoginThrottle();

    // Check if must change password
    if (foundUser.mustChangePassword) {
      setPendingUser(foundUser);
      setMustChangePassword(true);
      return;
    }

    // Login successful
    onLogin(foundUser);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (newPassword.length < 6) {
      setPwError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (pendingUser && onPasswordChanged) {
      // SECURITY FIX: Hash the new password before storing
      const hashedPassword = await hashPassword(newPassword);
      onPasswordChanged(pendingUser.id, hashedPassword);
    }

    setPwSuccess(true);

    // Auto-login after 2 seconds
    setTimeout(() => {
      if (pendingUser) {
        onLogin({ ...pendingUser, mustChangePassword: false, password: newPassword });
      }
    }, 2000);
  };

  // Force password change modal
  if (mustChangePassword && pendingUser) {
    return (
      <div className="bg-[#FDF8EE] text-[#3D4663] min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EFC14B] opacity-20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0F1E44] opacity-10 rounded-full blur-[120px] pointer-events-none" />

        <div className="z-10 w-full max-w-md">
          <div className="glass-panel rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-6 border border-[#E8DFD0]/60 bg-white/90">
            {/* Header */}
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-[#EFC14B]/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0F1E44] text-3xl">lock_reset</span>
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold text-[#0F1E44] tracking-tight">
                  Đổi mật khẩu
                </h1>
                <p className="text-sm text-[#7A829A] mt-1">
                  Đây là lần đăng nhập đầu tiên. Vui lòng đổi mật khẩu để tiếp tục.
                </p>
              </div>
            </div>

            {pwSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                </div>
                <p className="text-sm font-semibold text-green-700">Đổi mật khẩu thành công!</p>
                <p className="text-xs text-[#7A829A] mt-1">Đang đăng nhập...</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                {pwError && (
                  <div className="p-2.5 bg-[#FF3131]/10 text-[#FF3131] text-xs rounded-lg border border-[#FF3131]/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {pwError}
                  </div>
                )}

                {/* User Info */}
                <div className="bg-[#FDF8EE] rounded-xl p-3 border border-[#E8DFD0]/50">
                  <div className="flex items-center gap-3">
                    <img src={pendingUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold text-[#0F1E44]">{pendingUser.name}</p>
                      <p className="text-xs text-[#7A829A]">{pendingUser.employeeCode}</p>
                    </div>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#7A829A] uppercase tracking-wide">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7A829A] text-[20px]">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#E8DFD0] bg-white focus:border-[#EFC14B] focus:ring-2 focus:ring-[#EFC14B]/30 text-sm text-[#0F1E44] transition-colors outline-none"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      type="password"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#7A829A] uppercase tracking-wide">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7A829A] text-[20px]">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#E8DFD0] bg-white focus:border-[#EFC14B] focus:ring-2 focus:ring-[#EFC14B]/30 text-sm text-[#0F1E44] transition-colors outline-none"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      type="password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-[#0F1E44] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1A2D5A] transition-all shadow-navy active:scale-[0.98] cursor-pointer mt-1"
                >
                  <span>Đổi mật khẩu & Đăng nhập</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            )}

            <div className="text-center pt-3 border-t border-[#E8DFD0]/40">
              <p className="text-[11px] text-[#7A829A]">© 2025 AiiCafe — Where love brews and dreams grow</p>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <a href="mailto:ken02022008@gmail.com" className="text-[11px] text-[#7A829A] hover:text-[#0F1E44] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">mail</span>Email
                </a>
                <span className="text-[#E8DFD0]">|</span>
                <a href="tel:0962499209" className="text-[11px] text-[#7A829A] hover:text-[#0F1E44] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">call</span>096 2499 209
                </a>
                <span className="text-[#E8DFD0]">|</span>
                <a href="https://zalo.me/0962499209" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">chat</span>Zalo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Night-mode color tokens (day values are the originals) ──
  const labelColor = nightMode ? 'text-[#8FA3D0]' : 'text-[#7A829A]';
  const inputBox = nightMode
    ? 'border-[#2E4076] bg-[#0A142F] text-transparent focus:border-[#EFC14B] focus:ring-[#EFC14B]/25 placeholder:text-[#5C6E9C]'
    : 'border-[#E8DFD0] bg-white text-[#0F1E44] focus:border-[#EFC14B] focus:ring-[#EFC14B]/30 placeholder:text-[#7A829A]';
  const iconColor = nightMode ? 'text-[#EFC14B]/80' : 'text-[#7A829A]';  // Beam tracking lives on the PAGE ROOT: the spotlight sweeps freely
  // up/down/across the whole login (mouse move or touch drag).
  const trackBeam = (clientX: number, clientY: number) => {
    if (!flashOn) return;
    setBeam({ x: clientX, y: clientY });
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4 transition-colors duration-500 ${
        nightMode ? 'bg-[#0A142F] text-[#C9D4EC]' : 'bg-[#FDF8EE] text-[#3D4663]'
      }`
    }
      onMouseMove={(e) => trackBeam(e.clientX, e.clientY)}
      onMouseLeave={() => setBeam(null)}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) trackBeam(t.clientX, t.clientY);
        // Inside the password field the drag IS the flashlight (not scroll).
        if (flashOn && (e.target as HTMLElement).closest?.('#password')) e.preventDefault();
      }}
      onTouchEnd={() => setBeam(null)}
    >
      {/* AiiCafe brand background elements — deep navy + gold glow at night */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] pointer-events-none transition-colors duration-500 ${nightMode ? 'bg-[#1A2D5A] opacity-60' : 'bg-[#EFC14B] opacity-20'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${nightMode ? 'bg-[#EFC14B] opacity-10' : 'bg-[#0F1E44] opacity-10'}`} />

      {/* Twinkling stars — night mode only */}
      {nightMode && (
        <>
          <span aria-hidden="true" className="material-symbols-outlined animate-star absolute text-[#F2E9D8] pointer-events-none" style={{ top: '13%', left: '16%', fontSize: 15, animationDuration: '2.6s' }}>star</span>
          <span aria-hidden="true" className="material-symbols-outlined animate-star absolute text-[#EFC14B] pointer-events-none" style={{ top: '22%', right: '14%', fontSize: 12, animationDuration: '3.4s' }}>star</span>
          <span aria-hidden="true" className="material-symbols-outlined animate-star absolute text-[#F2E9D8] pointer-events-none" style={{ bottom: '18%', left: '10%', fontSize: 11, animationDuration: '4.1s' }}>star</span>
          <span aria-hidden="true" className="material-symbols-outlined animate-star absolute text-[#EFC14B] pointer-events-none" style={{ top: '8%', right: '38%', fontSize: 10, animationDuration: '3.0s' }}>star</span>
        </>
      )}

      {/* Flashlight beam — a soft cone shaft FROM the flashlight icon ending
          in a circular glow under the pointer (no diamond shape). */}
      {beamActive && beam && beamSource && (
        <>
          <div
            aria-hidden="true"
            className={`fixed inset-0 pointer-events-none ${nightMode ? 'animate-beam' : ''}`}
            style={{
              background: `radial-gradient(circle ${BEAM_REACH_PX + 20}px at ${beam.x}px ${beam.y}px, rgba(255, 214, 112, 0.30) 0%, rgba(255, 214, 112, 0.12) 45%, rgba(255, 214, 112, 0.04) 70%, transparent 100%)`,
              mixBlendMode: nightMode ? 'screen' : 'normal',
              zIndex: 30,
            }}
          />
          <svg
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none"
            width="100%"
            height="100%"
            style={{ zIndex: 30, mixBlendMode: nightMode ? 'screen' : 'normal' }}
          >
            <defs>
              <linearGradient id="beam-shaft-fill" gradientUnits="userSpaceOnUse" x1={beamSource.x} y1={beamSource.y} x2={beam.x} y2={beam.y}>
                <stop offset="0%" stopColor="rgba(255, 214, 112, 0.03)" />
                <stop offset="100%" stopColor="rgba(255, 214, 112, 0.18)" />
              </linearGradient>
            </defs>
            {/* Cone of light from the flashlight icon toward the pointer */}
            {(() => {
              const dx = beam.x - beamSource.x;
              const dy = beam.y - beamSource.y;
              const len = Math.hypot(dx, dy);
              if (len < 24) return null;
              const px = -dy / len;
              const py = dx / len;
              const sHalf = 6;
              const tHalf = BEAM_REACH_PX * 0.34;
              const pts = [
                `${beamSource.x + px * sHalf},${beamSource.y + py * sHalf}`,
                `${beamSource.x - px * sHalf},${beamSource.y - py * sHalf}`,
                `${beam.x - px * tHalf},${beam.y - py * tHalf}`,
                `${beam.x + px * tHalf},${beam.y + py * tHalf}`,
              ].join(' ');
              return <polygon points={pts} fill="url(#beam-shaft-fill)" />;
            })()}
          </svg>
        </>
      )}

      <div className="z-10 w-full max-w-md">
        <div
          className={`glass-panel rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-6 transition-colors duration-500 ${
            nightMode ? 'night-panel border border-[#2E4076]/70' : 'border border-[#E8DFD0]/60 bg-white/90'
          }`}
        >
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <img
              src="/aiicafe-logo-blue.png"
              alt="AiiCafe"
              className="h-12 w-auto transition-all duration-500"
              style={nightMode ? { filter: 'brightness(0) invert(1)' } : undefined}
            />
            <div>
              <h1 className={`font-heading text-3xl font-bold tracking-tight transition-colors duration-500 ${nightMode ? 'text-[#F2E9D8]' : 'text-[#0F1E44]'}`}>AiiCafe</h1>
              <p className={`text-sm mt-1 transition-colors duration-500 ${nightMode ? 'text-[#8FA3D0]' : 'text-[#7A829A]'}`}>Hệ thống quản trị nhân sự</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className={`rounded-xl p-3 text-xs flex items-start gap-2 transition-colors duration-500 ${
            nightMode ? 'bg-[#132252] border border-[#2E4076] text-[#A9BCE8]' : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            <span className="material-symbols-outlined text-[16px] mt-0.5">shield</span>
            <div>
              <p className="font-semibold">Đăng nhập được kiểm soát</p>
              <p className={`text-[11px] mt-0.5 ${nightMode ? 'text-[#7E93C7]' : 'text-blue-600'}`}>
                Chỉ quản lý mới có quyền tạo tài khoản. Liên hệ <a href="tel:0962499209" className="font-semibold underline">096 2499 209</a> hoặc <a href="mailto:ken02022008@gmail.com" className="font-semibold underline">Email</a> để được cấp tài khoản.
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className={`p-2.5 text-xs rounded-lg border flex items-center gap-2 ${
                nightMode ? 'bg-[#FF3131]/15 border-[#FF3131]/40 text-[#FF8A8A]' : 'bg-[#FF3131]/10 border-[#FF3131]/30 text-[#FF3131]'
              }`}>
                <span className="material-symbols-outlined text-[16px]">error</span>
                {errorMsg}
              </div>
            )}

            {/* Account Field — the owl perches on this bar */}
            <div className="flex flex-col gap-1 relative">
              <label className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-500 ${labelColor}`} htmlFor="username">
                Tài khoản
              </label>
              <div className="relative">
                {/* The owl is shy: invisible until the flashlight beam hits its perch */}
                <span ref={owlWrapRef} className="absolute -top-[26px] right-3 z-20 block pointer-events-none">
                  <Owl nightMode={nightMode} lit={owlLit} />
                </span>
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors duration-500 ${iconColor}`}>
                  person
                </span>
                <input
                  className={`w-full h-11 pl-10 pr-3 rounded-lg border text-sm transition-colors outline-none ${inputBox}`}
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Nhập mã nhân viên hoặc email"
                  type="text"
                />
              </div>
            </div>

            {/* Password Field — flashlight reveal */}
            <div className="flex flex-col gap-1 relative">
              <label className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-500 ${labelColor}`} htmlFor="password">
                Mật khẩu
              </label>
              <div ref={pwWrapRef} className={`relative ${flashOn ? 'touch-none' : ''}`}>
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors duration-500 ${iconColor}`}>
                  lock
                </span>
                <input
                  className={`w-full h-11 pl-10 pr-12 rounded-lg border text-sm transition-colors outline-none ${inputBox} ${
                    flashOn ? 'flash-input font-mono tracking-[0.08em] caret-[#EFC14B]' : ''
                  }`}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                />

                {/* Per-character reveal overlay — lit by the 2D beam above */}
                {flashOn && (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 16 }}>
                    <FlashlightBullets password={password} beam={beam} fieldRect={pwRect} />
                  </div>
                )}

                {/* Eye → flashlight: the icon only becomes a flashlight while
                    the password is being shown; clicking again restores the eye. */}
                <button
                  ref={flashBtnRef}
                  type="button"
                  title={
                    showPassword
                      ? 'Ẩn mật khẩu'
                      : 'Hiện mật khẩu — tia hình thoi từ đèn pin sẽ chiếu theo con trỏ 🦉'
                  }
                  onClick={() => {
                    setShowPassword(!showPassword);
                    if (showPassword) setBeam(null);
                  }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                    showPassword ? 'text-[#EFC14B] hover:text-[#D4A833]' : 'text-[#7A829A] hover:text-[#0F1E44]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'flashlight_on' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-[#EFC14B] hover:text-[#D4A833] hover:underline transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button — ripple ink from the click point */}
            <RippleButton
              type="submit"
              className={`w-full h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer mt-1 ${
                nightMode
                  ? 'bg-[#EFC14B] text-[#0F1E44] hover:bg-[#D4A833] shadow-golden'
                  : 'bg-[#0F1E44] text-white hover:bg-[#1A2D5A] shadow-navy'
              }`}
            >
              <span>Đăng nhập</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </RippleButton>
          </form>

          {/* Dev-only quick login — statically removed from production builds.
              `import.meta.env.DEV` is replaced with `false` at build time by Vite,
              so this JSX never ships; it exists purely to speed up manual testing
              of both roles without typing credentials. */}
          {import.meta.env.DEV && allUsers.length > 0 && (
            <div className={`pt-3 border-t border-dashed flex flex-col gap-2 transition-colors duration-500 ${nightMode ? 'border-[#2E4076]' : 'border-[#E8DFD0]/60'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide text-center transition-colors duration-500 ${nightMode ? 'text-[#8FA3D0]' : 'text-[#7A829A]'}`}>
                Dev — Đăng nhập nhanh
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[...allUsers]
                  .sort((a, b) => (a.role === 'manager' ? -1 : 1) - (b.role === 'manager' ? -1 : 1))
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        resetLoginThrottle();
                        onLogin(u);
                      }}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer ${
                        nightMode
                          ? 'border-[#2E4076] bg-[#132252] text-[#C9D4EC] hover:border-[#EFC14B] hover:bg-[#EFC14B]/10'
                          : 'border-[#E8DFD0] bg-white text-[#0F1E44] hover:border-[#EFC14B] hover:bg-[#EFC14B]/10'
                      }`}
                      title={`${u.employeeCode} · ${u.role}`}
                    >
                      {u.role === 'manager' ? '★ ' : ''}{u.name.split(' ').slice(-2).join(' ')}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={`pt-3 border-t transition-colors duration-500 ${nightMode ? 'border-[#2E4076]/60' : 'border-[#E8DFD0]/40'}`}>
            <p className={`text-[11px] text-center mb-2 transition-colors duration-500 ${nightMode ? 'text-[#7E93C7]' : 'text-[#7A829A]'}`}>© 2025 AiiCafe — Where love brews and dreams grow</p>
            <div className="flex flex-col gap-1.5">
              <a href="mailto:ken02022008@gmail.com" className={`flex items-center justify-center gap-1.5 text-[11px] transition-colors ${nightMode ? 'text-[#7E93C7] hover:text-[#C9D4EC]' : 'text-[#7A829A] hover:text-[#0F1E44]'}`}>
                <span className="material-symbols-outlined text-[13px]">mail</span>
                ken02022008@gmail.com
              </a>
              <a href="tel:0962499209" className={`flex items-center justify-center gap-1.5 text-[11px] transition-colors ${nightMode ? 'text-[#7E93C7] hover:text-[#C9D4EC]' : 'text-[#7A829A] hover:text-[#0F1E44]'}`}>
                <span className="material-symbols-outlined text-[13px]">call</span>
                096 2499 209
              </a>
              <a href="https://zalo.me/0962499209" target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-1.5 text-[11px] transition-colors ${nightMode ? 'text-[#7E93C7] hover:text-blue-400' : 'text-[#7A829A] hover:text-blue-600'}`}>
                <span className="material-symbols-outlined text-[13px]">chat</span>
                Chat Zalo hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#EFC14B]/20 text-[#0F1E44] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">lock_reset</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Khôi phục mật khẩu</h3>
            <p className="text-xs text-[#7A829A] mb-4">
              Nhập email hoặc mã nhân viên để nhận liên kết thiết lập lại mật khẩu qua email công ty.
            </p>

            {forgotSuccess ? (
              <div className="p-3 bg-[#EFC14B]/10 text-[#0F1E44] rounded-xl text-xs mb-4">
                ✓ Đã gửi hướng dẫn khôi phục mật khẩu đến email nội bộ của bạn.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="an.nguyen@aiicafe.vn hoặc NV-2023-045"
                  className="w-full h-10 px-3 border border-[#E8DFD0] rounded-lg text-sm outline-none focus:border-[#EFC14B]"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSuccess(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-lg"
              >
                Đóng
              </button>
              {!forgotSuccess && (
                <button
                  type="button"
                  onClick={() => setForgotSuccess(true)}
                  className="px-4 py-2 text-xs font-semibold bg-[#0F1E44] text-white rounded-lg hover:bg-[#1A2D5A]"
                >
                  Gửi yêu cầu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
