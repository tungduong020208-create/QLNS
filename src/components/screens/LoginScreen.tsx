import React, { useState } from 'react';
import { User } from '../../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  allUsers: User[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, allUsers }) => {
  const [username, setUsername] = useState('NV-2023-045');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tài khoản hoặc mã nhân viên');
      return;
    }
    
    // Check if matches any user by code, email or name
    const foundUser = allUsers.find(
      u => u.employeeCode.toLowerCase() === username.trim().toLowerCase() ||
           u.email.toLowerCase() === username.trim().toLowerCase() ||
           u.name.toLowerCase().includes(username.trim().toLowerCase())
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      // Default to the first employee if not found
      onLogin(allUsers[0]);
    }
  };

  const handleQuickLogin = (user: User) => {
    setUsername(user.employeeCode);
    onLogin(user);
  };

  return (
    <div className="bg-[#fbf8ff] text-[#1b1b21] min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4">
      {/* Abstract Background Elements for Corporate Modern feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#e0e0ff] opacity-40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#dee0ff] opacity-40 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-md">
        <div className="glass-panel rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-6 border border-[#c6c5d4]/60 bg-white/90">
          {/* Logo & Brand Header */}
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <div className="w-16 h-16 bg-[#000666] rounded-2xl flex items-center justify-center mb-1 shadow-md text-white">
              <span className="material-symbols-outlined text-[32px] fill">domain</span>
            </div>
            <h1 className="font-headline text-3xl font-bold text-[#000666] tracking-tight">Coffee House</h1>
            <p className="text-sm text-[#454652]">Hệ thống Quản lý nhân viên Tích hợp</p>
          </div>

          {/* Quick Account Switcher for Demo */}
          <div className="bg-[#f5f2fb] p-3 rounded-xl border border-[#c6c5d4]/50">
            <div className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">account_circle</span>
              Chọn tài khoản thử nghiệm nhanh:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allUsers.slice(0, 2).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user)}
                  className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-[#c6c5d4]/60 hover:border-[#000666] hover:bg-[#dee0ff]/30 text-left transition-all text-xs group"
                >
                  <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1b1b21] truncate">{user.name.split(' ').slice(-2).join(' ')}</p>
                    <p className="text-[10px] text-[#454652]">{user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-2.5 bg-[#ffdad6] text-[#93000a] text-xs rounded-lg border border-[#ba1a1a]/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {errorMsg}
              </div>
            )}

            {/* Account Field */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-xs font-semibold text-[#454652] uppercase tracking-wide" htmlFor="username">
                Tài khoản
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#454652] text-[20px]">
                  person
                </span>
                <input
                  className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#c6c5d4] bg-white focus:border-[#000666] focus:ring-1 focus:ring-[#000666] text-sm text-[#1b1b21] transition-colors outline-none placeholder:text-[#767683]"
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
              <label className="text-xs font-semibold text-[#454652] uppercase tracking-wide" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#454652] text-[20px]">
                  lock
                </span>
                <input
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#c6c5d4] bg-white focus:border-[#000666] focus:ring-1 focus:ring-[#000666] text-sm text-[#1b1b21] transition-colors outline-none"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454652] hover:text-[#000666] transition-colors"
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
                className="text-xs font-semibold text-[#000666] hover:text-[#1a237e] hover:underline transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-11 bg-[#000666] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1a237e] transition-all shadow-md active:scale-[0.98] cursor-pointer mt-1"
            >
              <span>Đăng nhập</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-3 border-t border-[#c6c5d4]/40">
            <p className="text-xs text-[#767683]">© 2024 Coffee House System. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#c6c5d4] animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#dee0ff] text-[#000666] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">lock_reset</span>
            </div>
            <h3 className="font-headline text-lg font-bold text-[#000666] mb-1">Khôi phục mật khẩu</h3>
            <p className="text-xs text-[#454652] mb-4">
              Nhập email hoặc mã nhân viên để nhận liên kết thiết lập lại mật khẩu qua email công ty.
            </p>

            {forgotSuccess ? (
              <div className="p-3 bg-[#e0e2ee] text-[#000666] rounded-xl text-xs mb-4">
                ✓ Đã gửi hướng dẫn khôi phục mật khẩu đến email nội bộ của bạn.
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="an.nguyen@enterprisehr.vn hoặc NV-2023-045"
                  className="w-full h-10 px-3 border border-[#c6c5d4] rounded-lg text-sm outline-none focus:border-[#000666]"
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
                className="px-4 py-2 text-xs font-semibold text-[#454652] hover:bg-[#f5f2fb] rounded-lg"
              >
                Đóng
              </button>
              {!forgotSuccess && (
                <button
                  type="button"
                  onClick={() => setForgotSuccess(true)}
                  className="px-4 py-2 text-xs font-semibold bg-[#000666] text-white rounded-lg hover:bg-[#1a237e]"
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
