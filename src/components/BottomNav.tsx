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
    { id: 'home', label: 'My Shift', icon: 'home' },
    { id: 'approval', label: 'Pending', icon: 'how_to_reg' },
    { id: 'manager_schedule', label: 'Schedule', icon: 'calendar_month' },
    { id: 'review', label: 'Handover', icon: 'handshake' },
    { id: 'peer_review', label: 'Peer Review', icon: 'rate_review' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  // Filter tabs based on role
  const tabs = currentUser?.role === 'manager'
    ? allTabs
    : allTabs.filter(t => t.id !== 'approval' && t.id !== 'manager_schedule');

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-[#0F1E44] border-t border-[#1A2D5A] rounded-t-xl shadow-lg md:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 relative group ${
              isActive
                ? 'bg-[#EFC14B] text-[#0F1E44] rounded-full px-4 py-1.5 scale-95 font-semibold shadow-golden'
                : 'text-white/60 hover:text-white rounded-full px-3.5 py-1.5'
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

              {tab.id === 'approval' && pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#FF3131] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingReviewCount > 9 ? '9+' : pendingReviewCount}
                </span>
              )}
            </div>
            <span className={`text-[11px] tracking-wide mt-0.5 whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
