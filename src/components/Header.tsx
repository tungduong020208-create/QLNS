import React, { useState } from 'react';
import { User, NotificationItem } from '../types';

interface HeaderProps {
  currentUser: User;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onSwitchUser?: (user: User) => void;
  allUsers: User[];
  onNavigateToProfile: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  onSwitchUser,
  allUsers,
  onNavigateToProfile,
  onLogout
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-[#fbf8ff] border-b border-[#c6c5d4] flex justify-between items-center px-4 h-16 shadow-none">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="relative h-9 w-9 rounded-full overflow-hidden border border-[#c6c5d4] flex-shrink-0 hover:ring-2 hover:ring-[#000666]/30 transition-all cursor-pointer"
          title="Chuyển đổi tài khoản"
        >
          <img
            alt={currentUser.name}
            className="w-full h-full object-cover"
            src={currentUser.avatar}
          />
        </button>

        <div className="flex flex-col">
          <div className="font-headline text-xl md:text-2xl font-bold text-[#000666] tracking-tight flex items-center gap-2">
            Coffee House
            {currentUser.role === 'manager' && (
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold bg-[#dee0ff] text-[#000e5e] px-2 py-0.5 rounded">
                Quản lý
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 relative">
        {/* User Switch Dropdown */}
        {showUserMenu && (
          <div className="absolute left-0 top-12 bg-white rounded-xl shadow-xl border border-[#c6c5d4] p-2 w-64 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-[#efecf5] text-xs font-semibold text-[#454652] uppercase tracking-wider">
              Chuyển đổi người dùng thử nghiệm
            </div>
            <div className="py-1 space-y-1">
              {allUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    if (onSwitchUser) onSwitchUser(user);
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    currentUser.id === user.id ? 'bg-[#dee0ff] text-[#000e5e] font-semibold' : 'hover:bg-[#f5f2fb] text-[#1b1b21]'
                  }`}
                >
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{user.name}</div>
                    <div className="text-[11px] text-[#454652] truncate">{user.role === 'manager' ? 'Quản lý duyệt' : user.department}</div>
                  </div>
                  {currentUser.id === user.id && (
                    <span className="material-symbols-outlined text-[18px] text-[#000666]">check</span>
                  )}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-[#efecf5]">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onNavigateToProfile();
                }}
                className="w-full text-center text-xs text-[#000666] font-semibold py-1 hover:underline"
              >
                Xem chi tiết hồ sơ cá nhân
              </button>
            </div>
          </div>
        )}

        {/* Notifications Button */}
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          aria-label="Thông báo"
          className="relative text-[#000666] hover:bg-[#f5f2fb] transition-colors rounded-full p-2 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popup */}
        {showNotifs && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-[#c6c5d4] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 bg-[#fbf8ff] border-b border-[#c6c5d4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-[#000666] text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <span className="bg-[#dee0ff] text-[#000e5e] text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={onClearAllNotifications}
                  className="text-xs text-[#4555b7] hover:underline"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#efecf5]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#454652]">
                  <span className="material-symbols-outlined text-4xl text-[#c6c5d4] mb-2">notifications_off</span>
                  <p>Không có thông báo mới</p>
                </div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onMarkNotificationRead(item.id)}
                    className={`p-3.5 hover:bg-[#f5f2fb] transition-colors cursor-pointer flex gap-3 ${
                      !item.read ? 'bg-[#f5f2fb]/60' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'reward' ? 'bg-[#dee0ff] text-[#000666]' :
                      item.type === 'penalty' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#efecf5] text-[#454652]'
                    }`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {item.type === 'reward' ? 'military_tech' : item.type === 'penalty' ? 'warning' : 'info'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-semibold ${!item.read ? 'text-[#000666]' : 'text-[#1b1b21]'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#767683]">{item.time}</span>
                      </div>
                      <p className="text-xs text-[#454652] leading-relaxed line-clamp-2">{item.message}</p>
                    </div>
                    {!item.read && (
                      <div className="w-2 h-2 rounded-full bg-[#000666] self-center flex-shrink-0"></div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-2 text-center bg-[#fbf8ff] border-t border-[#efecf5]">
              <button
                onClick={() => setShowNotifs(false)}
                className="text-xs text-[#454652] hover:text-[#000666] font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          aria-label="Đăng xuất"
          className="text-[#ba1a1a] hover:bg-red-50 transition-colors rounded-full p-2 flex items-center justify-center"
          title="Đăng xuất"
        >
          <span className="material-symbols-outlined text-[24px]">logout</span>
        </button>
      </div>
    </header>
  );
};
