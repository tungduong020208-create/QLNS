import React, { useState } from 'react';
import { User, UserRole } from '../../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (employee: User, tempPassword: string) => void;
  existingUsers: User[];
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Nhân viên' },
  { value: 'manager', label: 'Quản lý' },
];

// Generate a random temp password (8 chars, alphanumeric)
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate next employee code
function generateEmployeeCode(existingUsers: User[]): string {
  const year = new Date().getFullYear();
  const yearUsers = existingUsers.filter(u => u.employeeCode.includes(`-${year}-`));
  const nextNum = yearUsers.length + 1;
  return `NV-${year}-${String(nextNum).padStart(3, '0')}`;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
  existingUsers,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [tempPassword] = useState(() => generateTempPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [error, setError] = useState('');

  const employeeCode = generateEmployeeCode(existingUsers);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }

    // Check duplicate email
    const duplicateEmail = existingUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      setError('Email đã tồn tại trong hệ thống');
      return;
    }

    const newEmployee: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      employeeCode,
      role,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}&backgroundColor=EFC14B`,
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password: tempPassword,
      mustChangePassword: true,
      isAccountActive: true,
    };

    onAddEmployee(newEmployee, tempPassword);
    setStep('success');
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('employee');
    setError('');
    setStep('form');
    onClose();
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EFC14B]/20 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#0F1E44] text-xl">person_add</span>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Thêm nhân viên mới</h3>
                  <p className="text-xs text-[#7A829A]">Tạo tài khoản cho nhân viên mới</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Employee Code (auto-generated) */}
            <div className="bg-[#FDF8EE] rounded-xl p-3 mb-4 border border-[#E8DFD0]/50">
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Mã nhân viên tự动生成</p>
              <p className="text-lg font-bold text-[#0F1E44] font-heading">{employeeCode}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-2.5 bg-[#FF3131]/10 text-[#FF3131] text-xs rounded-lg border border-[#FF3131]/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1 uppercase tracking-wide">
                  Họ và tên <span className="text-[#FF3131]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full h-10 px-3 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1 uppercase tracking-wide">
                  Email công ty <span className="text-[#FF3131]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="a.nguyen@aiicafe.vn"
                  className="w-full h-10 px-3 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1 uppercase tracking-wide">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full h-10 px-3 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1 uppercase tracking-wide">
                  Vai trò
                </label>
                <div className="flex gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${
                        role === r.value
                          ? 'bg-[#0F1E44] text-white'
                          : 'bg-[#FDF8EE] text-[#0F1E44] border border-[#E8DFD0] hover:bg-[#EFC14B]/10'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temp Password */}
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1 uppercase tracking-wide">
                  Mật khẩu tạm thời
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={tempPassword}
                    readOnly
                    className="w-full h-10 px-3 pr-10 border border-[#E8DFD0] rounded-lg text-sm bg-[#F5F5F5] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A829A] hover:text-[#0F1E44]"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-[#7A829A] mt-1">
                  ℹ️ Nhân viên sẽ phải đổi mật khẩu khi đăng nhập lần đầu
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 h-11 rounded-xl border-2 border-[#E8DFD0] text-[#7A829A] font-semibold text-sm hover:bg-[#FDF8EE] transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm shadow-md hover:bg-[#1A2D5A] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Success Step */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] mb-2">
              Tạo tài khoản thành công!
            </h3>
            <p className="text-sm text-[#7A829A] mb-6">
              Tài khoản đã được tạo cho <strong className="text-[#0F1E44]">{name}</strong>
            </p>

            {/* Credentials Card */}
            <div className="bg-[#FDF8EE] rounded-xl p-4 text-left mb-6 border border-[#E8DFD0]/50">
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold mb-3">
                Thông tin đăng nhập
              </p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7A829A]">Mã nhân viên:</span>
                  <span className="text-sm font-bold text-[#0F1E44]">{employeeCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7A829A]">Mật khẩu:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0F1E44] font-mono">
                      {showPassword ? tempPassword : '••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#7A829A] hover:text-[#0F1E44]"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                    <button
                      onClick={handleCopyPassword}
                      className="text-[#EFC14B] hover:text-[#D4A833]"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#E8DFD0]/50">
                <p className="text-[10px] text-[#7A829A] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">info</span>
                  Nhân viên sẽ phải đổi mật khẩu khi đăng nhập lần đầu
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('form');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setRole('employee');
                  setError('');
                }}
                className="flex-1 h-11 rounded-xl border-2 border-[#E8DFD0] text-[#0F1E44] font-semibold text-sm hover:bg-[#FDF8EE] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Thêm nhân viên khác
              </button>
              <button
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm shadow-md hover:bg-[#1A2D5A] transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
