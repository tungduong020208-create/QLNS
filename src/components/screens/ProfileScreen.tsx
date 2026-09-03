import React, { useState, useRef } from 'react';
import { User, EvidenceItem } from '../../types';

interface ProfileScreenProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  onLogout: () => void;
  evidences: EvidenceItem[];
  onOpenAddEmployee?: () => void;  // Manager only
  mustChangePassword?: boolean;   // Force password change flow
  onChangePassword?: (newPassword: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onUpdateUser,
  onLogout,
  evidences,
  onOpenAddEmployee,
  mustChangePassword,
  onChangePassword,
}) => {
  const [activeModal, setActiveModal] = useState<'account' | 'password' | 'notifications' | 'support' | 'logout' | null>(null);

  // Account edit form state
  const [editName, setEditName] = useState(currentUser.name);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '0912 345 678');

  // Password form state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Notification settings state
  const [notifApproval, setNotifApproval] = useState(true);
  const [notifReward, setNotifReward] = useState(true);
  const [notifRemind, setNotifRemind] = useState(true);
  const [notifSchedule, setNotifSchedule] = useState(true);
  const [notifPeerReview, setNotifPeerReview] = useState(true);
  const [notifSound, setNotifSound] = useState(false);

  // Support form state
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onUpdateUser({ avatar: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: editName,
      email: editEmail,
      phone: editPhone,
    });
    setActiveModal(null);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Vui lòng điền đầy đủ các trường');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu mới không khớp');
      return;
    }
    if (newPw.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setPwError('');
    setPwSuccess(true);
    setTimeout(() => {
      setPwSuccess(false);
      setActiveModal(null);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }, 1200);
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSuccess(true);
    setTimeout(() => {
      setSupportSuccess(false);
      setSupportMessage('');
      setActiveModal(null);
    }, 1500);
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Profile Header */}
      <section className="flex flex-col items-center mb-8 text-center">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#EFC14B] shadow-golden mb-3 bg-[#F5EDDF] group">
          <img
            alt={currentUser.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={currentUser.avatar}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 left-0 right-0 bg-[#0F1E44]/80 text-white py-1 text-center text-xs font-semibold opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">photo_camera</span>
            Thay ảnh
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <h1 className="font-heading text-2xl font-bold text-[#0F1E44] mb-0.5">
          {currentUser.name}
        </h1>
        <p className="text-sm font-semibold text-[#7A829A] mb-2">{currentUser.employeeCode}</p>
        <span className="inline-block px-3.5 py-1 text-[#0F1E44] bg-[#EFC14B]/20 border border-[#EFC14B] rounded-full text-xs font-bold uppercase tracking-wider">
          {currentUser.role === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
        </span>
      </section>

      {/* Settings List */}
      <section className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy overflow-hidden mb-6 divide-y divide-[#F5EDDF]">
        {/* 1. Account Info */}
        <button
          type="button"
          onClick={() => setActiveModal('account')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#EFC14B]/20 text-[#0F1E44] rounded-xl group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1E44]">Thông tin tài khoản</h3>
              <p className="text-xs text-[#7A829A]">Cập nhật hồ sơ, liên hệ</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
            chevron_right
          </span>
        </button>

        {/* 2. Change Password */}
        <button
          type="button"
          onClick={() => setActiveModal('password')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#F5EDDF] text-[#0F1E44] rounded-xl group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">lock</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1E44]">Đổi mật khẩu</h3>
              <p className="text-xs text-[#7A829A]">Bảo mật tài khoản</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
            chevron_right
          </span>
        </button>

        {/* 4. Notification Settings */}
        <button
          type="button"
          onClick={() => setActiveModal('notifications')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#F5EDDF] text-[#0F1E44] rounded-xl group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">notifications_active</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1E44]">Cài đặt thông báo</h3>
              <p className="text-xs text-[#7A829A]">Tùy chỉnh thông báo nhận được</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
            chevron_right
          </span>
        </button>

        {/* 5. Support */}
        <button
          type="button"
          onClick={() => setActiveModal('support')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#F5EDDF] text-[#0F1E44] rounded-xl group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">help</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1E44]">Hỗ trợ</h3>
              <p className="text-xs text-[#7A829A]">Liên hệ quản lý cửa hàng</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
            chevron_right
          </span>
        </button>

        {/* Manager: Team Management */}
        {currentUser.role === 'manager' && (
          <>
            <button
              type="button"
              onClick={() => setActiveModal('team')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-[#EFC14B]/20 text-[#0F1E44] rounded-xl group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">group</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F1E44]">Quản lý nhân viên</h3>
                  <p className="text-xs text-[#7A829A]">Xem danh sách và hiệu suất team</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </button>

            {/* Add Employee Button (Manager only) */}
            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8EE] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-green-100 text-green-700 rounded-xl group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F1E44]">Thêm nhân viên</h3>
                  <p className="text-xs text-[#7A829A]">Tạo tài khoản mới cho nhân viên</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#7A829A] group-hover:text-[#EFC14B] group-hover:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </button>
          </>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={() => setActiveModal('logout')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FF3131]/5 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#FF3131]/15 text-[#FF3131] rounded-xl group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#FF3131]">Đăng xuất</h3>
              <p className="text-xs text-[#7A829A]">Thoát khỏi phiên làm việc</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#FF3131]">chevron_right</span>
        </button>
      </section>

      {/* Account Info Modal */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Thông tin tài khoản</h3>
              <button onClick={() => setActiveModal(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#7A829A] mb-1">Mã nhân viên (Cố định)</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.employeeCode}
                  className="w-full px-3 py-2 bg-[#FDF8EE] border border-[#E8DFD0] rounded-lg text-sm text-[#7A829A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7A829A] mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7A829A] mb-1">Email công ty</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#7A829A] mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm focus:border-[#EFC14B] outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-[#0F1E44] text-white rounded-lg hover:bg-[#1A2D5A]"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-2">Đổi mật khẩu</h3>
            <p className="text-xs text-[#7A829A] mb-4">
              Mật khẩu mới phải có độ dài tối thiểu 6 ký tự để bảo vệ tài khoản nội bộ.
            </p>

            {pwSuccess ? (
              <div className="p-3 bg-[#EFC14B]/20 text-[#0F1E44] text-xs font-bold rounded-xl mb-4 text-center">
                ✓ Đổi mật khẩu thành công!
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3 text-xs mb-4">
                {pwError && (
                  <div className="p-2 bg-[#FF3131]/10 text-[#FF3131] rounded-lg font-semibold">{pwError}</div>
                )}
                <div>
                  <label className="block font-semibold text-[#7A829A] mb-1">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A829A] mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A829A] mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-[#E8DFD0] rounded-lg text-sm"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold bg-[#0F1E44] text-white rounded-lg hover:bg-[#1A2D5A]"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Cài đặt thông báo</h3>
            <p className="text-xs text-[#7A829A] mb-4">Tùy chỉnh thông báo đẩy và email nội bộ</p>

            <div className="space-y-3 mb-6 text-xs">
              <label className="flex items-center justify-between p-2.5 bg-[#FDF8EE] rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-[#0F1E44]">Kết quả duyệt minh chứng</div>
                  <div className="text-[11px] text-[#7A829A]">Khi quản lý duyệt hoặc từ chối</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifApproval}
                  onChange={(e) => setNotifApproval(e.target.checked)}
                  className="w-4 h-4 text-[#EFC14B] rounded focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-[#FDF8EE] rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-[#0F1E44]">Thay đổi lịch làm việc</div>
                  <div className="text-[11px] text-[#7A829A]">Khi quản lý thêm/sửa/xóa ca</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifSchedule}
                  onChange={(e) => setNotifSchedule(e.target.checked)}
                  className="w-4 h-4 text-[#EFC14B] rounded focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-[#FDF8EE] rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-[#0F1E44]">Đánh giá chéo</div>
                  <div className="text-[11px] text-[#7A829A]">Khi có người đánh giá bạn</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPeerReview}
                  onChange={(e) => setNotifPeerReview(e.target.checked)}
                  className="w-4 h-4 text-[#EFC14B] rounded focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-[#FDF8EE] rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-[#0F1E44]">Nhắc nhở nộp báo cáo ca</div>
                  <div className="text-[11px] text-[#7A829A]">Thông báo 30 phút trước khi hết ca</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifRemind}
                  onChange={(e) => setNotifRemind(e.target.checked)}
                  className="w-4 h-4 text-[#EFC14B] rounded focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-[#FDF8EE] rounded-xl cursor-pointer">
                <div>
                  <div className="font-bold text-[#0F1E44]">Thưởng điểm & xếp hạng</div>
                  <div className="text-[11px] text-[#7A829A]">Khi nhận điểm thưởng tuần/tháng</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifReward}
                  onChange={(e) => setNotifReward(e.target.checked)}
                  className="w-4 h-4 text-[#EFC14B] rounded focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-[#0F1E44] text-white rounded-xl text-xs font-bold hover:bg-[#1A2D5A]"
            >
              Lưu cài đặt
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Hỗ trợ kỹ thuật & Quản trị</h3>
            <p className="text-xs text-[#7A829A] mb-3">
              Hotline: <strong>1900 6868</strong> hoặc gửi tin nhắn bên dưới:
            </p>

            {supportSuccess ? (
              <div className="p-3 bg-[#EFC14B]/20 text-[#0F1E44] text-xs font-bold rounded-xl mb-4 text-center">
                ✓ Đã gửi yêu cầu hỗ trợ! Bộ phận quản lý sẽ liên hệ lại.
              </div>
            ) : (
              <form onSubmit={handleSendSupport} className="space-y-3 text-xs mb-3">
                <textarea
                  rows={3}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Mô tả sự cố hoặc thắc mắc của bạn..."
                  className="w-full p-3 border border-[#E8DFD0] rounded-xl text-xs focus:border-[#EFC14B] outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold bg-[#0F1E44] text-white rounded-lg hover:bg-[#1A2D5A]"
                  >
                    Gửi tin nhắn
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Team Management Modal (Manager only) */}
      {activeModal === 'team' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-lg border border-[#E8DFD0] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Quản lý nhân viên</h3>
                <p className="text-xs text-[#7A829A]">Danh sách nhân viên trong team</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F5EDDF]">
              {evidences.filter(e => e.employeeId !== currentUser.id).reduce((acc, ev) => {
                if (!acc.find(e => e.employeeId === ev.employeeId)) acc.push(ev);
                return acc;
              }, [] as EvidenceItem[]).map(ev => (
                <div key={ev.employeeId} className="py-3 flex items-center gap-3">
                  <img src={ev.employeeAvatar} alt={ev.employeeName} className="w-10 h-10 rounded-full object-cover border border-[#E8DFD0]" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-[#0F1E44]">{ev.employeeName}</div>
                    <div className="text-xs text-[#7A829A]">{ev.department}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#0F1E44]">
                      {evidences.filter(e => e.employeeId === ev.employeeId).reduce((sum, e) => sum + e.points, 0)} pts
                    </div>
                    <div className="text-xs text-[#7A829A]">
                      {evidences.filter(e => e.employeeId === ev.employeeId).length} báo cáo
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-2.5 bg-[#0F1E44] text-white rounded-xl text-xs font-bold hover:bg-[#1A2D5A] mt-3">Đóng</button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {activeModal === 'logout' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-lg border border-[#E8DFD0] text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#FF3131]/15 text-[#FF3131] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px]">logout</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Đăng xuất tài khoản?</h3>
            <p className="text-xs text-[#7A829A] mb-5">
              Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống AiiCafe HR.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-xl border border-[#E8DFD0]"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 py-2.5 text-xs font-bold bg-[#FF3131] text-white rounded-xl hover:bg-[#D42C2C] shadow-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
