import React from 'react';
import { ActiveTab, User } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User;
  pendingReviewCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  pendingReviewCount = 0
}) => {
  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Trang chủ', icon: 'home' },
    ...(currentUser.role === 'employee' ? [{ id: 'submit' as ActiveTab, label: 'Báo cáo', icon: 'assignment' }] : []),
    ...(currentUser.role === 'manager' ? [{ id: 'approval' as ActiveTab, label: 'Duyệt', icon: 'how_to_reg' }] : []),
    { id: 'review', label: 'Bàn giao ca', icon: 'handshake' },
    { id: 'profile', label: 'Cá nhân', icon: 'person' },
  ];

  return (
    <nav className="hidden md:flex flex-col w-64 bg-[#fbf8ff] border-r border-[#c6c5d4] fixed top-0 left-0 h-full z-40 p-4 pt-20">
      <div className="flex items-center gap-3 mb-8 px-2">
        <img
          className="w-10 h-10 rounded-full object-cover border border-[#c6c5d4]"
          src={currentUser.avatar}
          alt={currentUser.name}
        />
        <div className="min-w-0">
          <h2 className="font-headline text-sm font-bold text-[#000666] truncate">{currentUser.name}</h2>
                  </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                isActive
                  ? 'bg-[#dee0ff] text-[#000e5e] font-bold shadow-sm'
                  : 'text-[#454652] hover:bg-[#f5f2fb] hover:text-[#000666]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isActive ? 'fill' : ''
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="text-sm font-medium">{tab.label}</span>
              </div>
              {tab.id === 'review' && pendingReviewCount > 0 && (
                <span className="bg-[#ba1a1a] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingReviewCount}
                </span>
              )}
              {tab.id === 'approval' && pendingReviewCount > 0 && (
                <span className="bg-[#d97706] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingReviewCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-[#f5f2fb] rounded-xl border border-[#c6c5d4]/40 mt-auto text-xs text-[#454652]">
        <div className="font-semibold text-[#000666] mb-0.5">Coffee House HR v2.4</div>
        <p className="text-[11px] text-[#767683]">Quản lý nhân viên quán cà phê</p>
      </div>
    </nav>
  );
};
