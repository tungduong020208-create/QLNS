import React from 'react';
import { ActiveTab, User } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingReviewCount?: number;
  currentUser?: User;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingReviewCount = 0,
  currentUser
}) => {
  const allTabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Trang chủ', icon: 'home' },
    { id: 'submit', label: 'Báo cáo', icon: 'assignment' },
    { id: 'review', label: 'Bàn giao ca', icon: 'handshake' },
    { id: 'profile', label: 'Cá nhân', icon: 'person' },
  ];
  
  // Filter tabs based on role
  const tabs = currentUser?.role === 'manager' 
    ? allTabs.filter(t => t.id !== 'submit')
    : allTabs;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-[#fbf8ff] border-t border-[#c6c5d4] rounded-t-xl shadow-sm md:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 relative group ${
              isActive
                ? 'bg-[#dee0ff] text-[#000e5e] rounded-full px-4 py-1 scale-95 font-semibold'
                : 'text-[#454652] hover:bg-[#eae7ef] rounded-full px-3.5 py-1'
            }`}
          >
            <div className="relative">
              <span
                className={`material-symbols-outlined text-[24px] ${
                  isActive ? 'fill' : ''
                }`}
              >
                {tab.icon}
              </span>
              {tab.id === 'review' && pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#ba1a1a] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingReviewCount > 9 ? '9+' : pendingReviewCount}
                </span>
              )}
            </div>
            <span className={`text-[12px] tracking-wide mt-0.5 whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};