import React, { useState } from 'react';
import { User } from '../../types';

// Set to true ONLY for staging/development builds
// In production, set this to false to hide demo accounts
const IS_DEMO_ENABLED = false;

interface LoginScreenProps {
  onLogin: (user: User) => void;
  allUsers: User[];
  onPasswordChanged?: (userId: string, newPassword: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, allUsers, onPasswordChanged }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Force password change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      return;
    }

    // Check password (for demo: use stored password or default 'aiicafe')
    const storedPassword = foundUser.password || 'aiicafe';
    if (password !== storedPassword) {
      setErrorMsg('Mật khẩu không đúng. Vui lòng thử lại.');
      return;
    }

    // Check if must change password
    if (foundUser.mustChangePassword) {
      setPendingUser(foundUser);
      setMustChangePassword(true);
      return;
    }

    // Login successful
    onLogin(foundUser);
  };

  // Demo quick-login handler (only in staging)
  const handleQuickLogin = (user: User) => {
    setUsername(user.employeeCode);
    setPassword(user.password || 'aiicafe');

    if (user.mustChangePassword) {
      setPendingUser(user);
      setMustChangePassword(true);
      return;
    }

    onLogin(user);
  };

  const handleChangePassword = (e: React.FormEvent) => {
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
      onPasswordChanged(pendingUser.id, newPassword);
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

  return (
    <div className="bg-[#FDF8EE] text-[#3D4663] min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4">
      {/* AiiCafe brand background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EFC14B] opacity-20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0F1E44] opacity-10 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-md">
        <div className="glass-panel rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-6 border border-[#E8DFD0]/60 bg-white/90">
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <img
              src="/aiicafe-logo-blue.png"
              alt="AiiCafe"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="font-heading text-3xl font-bold text-[#0F1E44] tracking-tight">AiiCafe</h1>
              <p className="text-sm text-[#7A829A] mt-1">Hệ thống Quản lý nhân viên</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5">shield</span>
            <div>
              <p className="font-semibold">Đăng nhập được kiểm soát</p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                Chỉ quản lý mới có quyền tạo tài khoản. Liên hệ <a href="tel:0962499209" className="font-semibold underline">096 2499 209</a> hoặc <a href="mailto:ken02022008@gmail.com" className="font-semibold underline">Email</a> để được cấp tài khoản.
              </p>
            </div>
          </div>

          {/* Demo Quick Login (staging/development only) */}
          {IS_DEMO_ENABLED && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">science</span>
                Demo Mode - Quick Login
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {allUsers.filter(u => u.isAccountActive !== false).slice(0, 4).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-amber-200/60 hover:border-amber-400 hover:bg-amber-100/50 text-left transition-all text-xs"
                  >
                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-800 truncate text-[11px]">{user.name.split(' ').slice(-1)[0]}</p>
                      <p className="text-[9px] text-amber-600">{user.role === 'manager' ? 'Admin' : 'Emp'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-2.5 bg-[#FF3131]/10 text-[#FF3131] text-xs rounded-lg border border-[#FF3131]/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {errorMsg}
              </div>
            )}

            {/* Account Field */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-xs font-semibold text-[#7A829A] uppercase tracking-wide" htmlFor="username">
                Tài khoản
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7A829A] text-[20px]">
                  person
                </span>
                <input
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#E8DFD0] bg-white focus:border-[#EFC14B] focus:ring-2 focus:ring-[#EFC14B]/30 text-sm text-[#0F1E44] transition-colors outline-none placeholder:text-[#7A829A]"
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

            {/* Password Field */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-xs font-semibold text-[#7A829A] uppercase tracking-wide" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7A829A] text-[20px]">
                  lock
                </span>
                <input
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#E8DFD0] bg-white focus:border-[#EFC14B] focus:ring-2 focus:ring-[#EFC14B]/30 text-sm text-[#0F1E44] transition-colors outline-none"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A829A] hover:text-[#0F1E44] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-11 bg-[#0F1E44] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1A2D5A] transition-all shadow-navy active:scale-[0.98] cursor-pointer mt-1"
            >
              <span>Đăng nhập</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Footer */}
          <div className="pt-3 border-t border-[#E8DFD0]/40">
            <p className="text-[11px] text-[#7A829A] text-center mb-2">© 2025 AiiCafe — Where love brews and dreams grow</p>
            <div className="flex flex-col gap-1.5">
              <a href="mailto:ken02022008@gmail.com" className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A829A] hover:text-[#0F1E44] transition-colors">
                <span className="material-symbols-outlined text-[13px]">mail</span>
                ken02022008@gmail.com
              </a>
              <a href="tel:0962499209" className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A829A] hover:text-[#0F1E44] transition-colors">
                <span className="material-symbols-outlined text-[13px]">call</span>
                096 2499 209
              </a>
              <a href="https://zalo.me/0962499209" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A829A] hover:text-blue-600 transition-colors">
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
