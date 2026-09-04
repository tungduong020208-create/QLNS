import React from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../types';
import { ROUTES } from '../routes';

interface SidebarProps {
  currentUser: User;
  pendingReviewCount?: number;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  pendingReviewCount = 0,
  onNavigate,
}) => {
  const location = useLocation();

  // Map route paths to tab IDs for active state detection
  const tabFromPath = (pathname: string): string => {
    if (pathname === '/' || pathname.endsWith('/home')) return 'home';
    if (pathname.includes('/approval')) return 'approval';
    if (pathname.includes('/schedule')) return 'manager_schedule';
    if (pathname.includes('/handover')) return 'review';
    if (pathname.includes('/peer-review')) return 'peer_review';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = tabFromPath(location.pathname);

  const tabs: { id: string; label: string; icon: string }[] = [
    { id: 'home', label: 'My Shift', icon: 'home' },
    ...(currentUser.role === 'manager'
      ? [
          { id: 'approval', label: 'Pending', icon: 'how_to_reg' },
          { id: 'manager_schedule', label: 'Schedule', icon: 'calendar_month' },
        ]
      : []),
    { id: 'review', label: 'Handover', icon: 'handshake' },
    { id: 'peer_review', label: 'Peer Review', icon: 'rate_review' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="hidden md:flex flex-col w-64 bg-[#0F1E44] fixed top-0 left-0 h-full z-40 p-4 pt-20">
      <button
        onClick={() => onNavigate('profile')}
        className="flex items-center gap-3 mb-8 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors text-left w-full"
      >
        <img
          className="w-11 h-11 rounded-full object-cover border-2 border-[#EFC14B]"
          src={currentUser.avatar}
          alt={currentUser.name}
        />
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-white truncate">{currentUser.name}</h2>
          <p className="text-[11px] text-[#7A829A] truncate">{currentUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</p>
        </div>
      </button>

      <div className="flex flex-col gap-1.5 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                isActive
                  ? 'bg-[#EFC14B] text-[#0F1E44] font-bold shadow-golden'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill' : ''}`}>
                  {tab.icon}
                </span>
                <span className="text-sm font-medium">{tab.label}</span>
              </div>

              {tab.id === 'approval' && pendingReviewCount > 0 && (
                <span className="bg-[#FF3131] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingReviewCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-white/5 rounded-xl mt-auto text-xs text-white/50 space-y-1.5">
        <div className="font-heading font-semibold text-[#EFC14B] mb-0.5">AiiCafe HR v2.5</div>
        <p className="text-[11px] text-white/40">Quản lý nhân viên</p>
        <div className="border-t border-white/10 pt-1.5 space-y-1">
          <a href="mailto:ken02022008@gmail.com" className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors">
            <span className="material-symbols-outlined text-[11px]">mail</span>ken02022008@gmail.com
          </a>
          <a href="tel:0962499209" className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors">
            <span className="material-symbols-outlined text-[11px]">call</span>096 2499 209
          </a>
          <a href="https://zalo.me/0962499209" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-[#EFC14B] transition-colors">
            <span className="material-symbols-outlined text-[11px]">chat</span>Zalo hỗ trợ
          </a>
        </div>
      </div>
    </nav>
  );
};
