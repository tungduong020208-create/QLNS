import React, { useState } from 'react';
import { User, NotificationItem } from '../types';

interface HeaderProps {
  currentUser: User;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  onNavigateToProfile,
  onLogout
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Only show management notifications in the bell
  const managementNotifications = notifications.filter(n => n.category === 'management');
  const unreadCount = managementNotifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#FDF8EE] border-b border-[#E8DFD0] flex justify-between items-center px-4 h-16">
      <div className="flex items-center gap-3">
        <img
          src="/aiicafe-logo-blue.png"
          alt="AiiCafe"
          className="h-8 w-auto"
        />
        {currentUser.role === 'manager' && (
          <span className="hidden sm:inline-block text-[10px] uppercase font-semibold bg-[#0F1E44] text-[#EFC14B] px-2 py-0.5 rounded-full">
            Quản lý
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 relative">
        {/* Notifications Button */}
        <button
          onClick={() => {
            const opening = !showNotifs;
            setShowNotifs(opening);
            // Auto-mark all management notifications as read when opening
            if (opening && unreadCount > 0) {
              onClearAllNotifications();
            }
          }}
          aria-label="Thông báo"
          className="relative text-[#0F1E44] hover:bg-[#EFC14B]/15 transition-colors rounded-full p-2 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF3131] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popup */}
        {showNotifs && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-[#E8DFD0] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 bg-[#FDF8EE] border-b border-[#E8DFD0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-[#0F1E44] text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <span className="bg-[#EFC14B]/20 text-[#0F1E44] text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {managementNotifications.length > 0 && unreadCount === 0 && (
                <span className="text-xs text-[#7A829A] font-medium">
                  Đã đọc
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#F5EDDF]">
              {managementNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#7A829A]">
                  <span className="material-symbols-outlined text-4xl text-[#E8DFD0] mb-2">notifications_off</span>
                  <p>Không có thông báo mới</p>
                </div>
              ) : (
                managementNotifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onMarkNotificationRead(item.id)}
                    className={`p-3.5 hover:bg-[#FDF8EE] transition-colors cursor-pointer flex gap-3 ${
                      !item.read ? 'bg-[#EFC14B]/5' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'reward' ? 'bg-[#EFC14B]/20 text-[#0F1E44]' :
                      item.type === 'penalty' ? 'bg-[#FF3131]/15 text-[#FF3131]' : 'bg-[#F5EDDF] text-[#7A829A]'
                    }`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {item.type === 'reward' ? 'military_tech' : item.type === 'penalty' ? 'warning' : 'info'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-semibold ${!item.read ? 'text-[#0F1E44]' : 'text-[#3D4663]'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#7A829A]">{item.time}</span>
                      </div>
                      <p className="text-xs text-[#7A829A] leading-relaxed line-clamp-2">{item.message}</p>
                    </div>
                    {!item.read && (
                      <div className="w-2 h-2 rounded-full bg-[#EFC14B] self-center flex-shrink-0"></div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-2 text-center bg-[#FDF8EE] border-t border-[#F5EDDF]">
              <button
                onClick={() => setShowNotifs(false)}
                className="text-xs text-[#7A829A] hover:text-[#0F1E44] font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="Đăng xuất"
          className="text-[#FF3131] hover:bg-[#FF3131]/10 transition-colors rounded-full p-2 flex items-center justify-center"
          title="Đăng xuất"
        >
          <span className="material-symbols-outlined text-[24px]">logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#FF3131]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-[#FF3131]">logout</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Đăng xuất tài khoản?</h3>
              <p className="text-[13px] text-[#7A829A] mb-1">
                Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
              </p>
              <p className="text-[11px] text-[#7A829A]">
                Tất cả dữ liệu chưa lưu sẽ bị mất.
              </p>
            </div>
            <div className="flex border-t border-[#E8DFD0]">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 text-sm font-medium text-[#7A829A] hover:bg-[#FDF8EE] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 py-3 text-sm font-medium text-[#FF3131] hover:bg-[#FF3131]/10 transition-colors border-l border-[#E8DFD0]"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
