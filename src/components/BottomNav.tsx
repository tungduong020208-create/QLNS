import React from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../types';

interface BottomNavProps {
  pendingReviewCount?: number;
  currentUser?: User;
  onNavigate: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  pendingReviewCount = 0,
  currentUser,
  onNavigate,
}) => {
  const location = useLocation();

  // Map route paths to tab IDs for active state detection
  const tabFromPath = (pathname: string): string => {
    if (pathname === '/' || pathname.endsWith('/home')) return 'home';
    if (pathname.includes('/schedule')) return 'manager_schedule';
    if (pathname.includes('/work-hours')) return 'work_hours';
    if (pathname.includes('/study-schedules')) return 'study_schedules';
    if (pathname.includes('/export')) return 'export_report';
    if (pathname.includes('/handover')) return 'review';
    if (pathname.includes('/peer-review')) return 'peer_review';
    if (pathname.includes('/shift-registration')) return 'study_schedule';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = tabFromPath(location.pathname);

  const allTabs: { id: string; label: string; icon: string }[] = [
    { id: 'home', label: currentUser?.role === 'manager' ? 'Hôm nay' : 'Lịch & Công', icon: 'home' },
    { id: 'manager_schedule', label: 'Quản lý', icon: 'dashboard' },
    { id: 'work_hours', label: 'Giờ làm', icon: 'schedule' },
    { id: 'study_schedules', label: 'Lịch học NV', icon: 'school' },
    { id: 'review', label: 'Bảng Tin', icon: 'handshake' },
    { id: 'peer_review', label: 'Đánh giá', icon: 'rate_review' },
    { id: 'export_report', label: 'Xuất báo cáo', icon: 'download' },
    { id: 'study_schedule', label: 'Đăng ký lịch', icon: 'event_available' },
    { id: 'profile', label: 'Trang cá nhân', icon: 'person' },
  ];

  // Filter tabs based on role
  // Manager: sees dashboard, reviews, peer review, export, profile (NOT employee shift registration)
  // Employee: sees home, reviews, peer review, study schedule, profile (NOT manager tools)
  const tabs = currentUser?.role === 'manager'
    ? allTabs.filter(t => t.id !== 'study_schedule')  // Manager uses study_schedules instead
    : allTabs.filter(t => t.id !== 'manager_schedule' && t.id !== 'export_report' && t.id !== 'work_hours' && t.id !== 'study_schedules');

  // ─── Navigation grouping (UI-only, mobile) ───
  // With many tabs the single bottom row gets cramped. Show "home" inline and
  // collapse ALL other tabs into a "Khác" cluster that opens a full-height
  // sheet listing every tab (exact labels/icons/order as before). Tapping an
  // item navigates via the same onNavigate(tab id) as before — nothing about
  // routing, permissions or content changes.
  const [moreOpen, setMoreOpen] = React.useState(false);
  const homeTab = tabs.find(t => t.id === 'home')!;
  const otherTabs = tabs.filter(t => t.id !== 'home');
  const moreActive = otherTabs.some(t => t.id === activeTab);

  const handleTabClick = (tabId: string) => {
    setMoreOpen(false);
    onNavigate(tabId);
  };

  return (
    <>
      {/* Full tab sheet opened by the "Khác" cluster */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[#0F1E44] rounded-t-2xl border-t border-[#1A2D5A] shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h3 className="font-heading text-base font-bold text-white">Tất cả mục</h3>
                <p className="text-[11px] text-white/50 mt-0.5">Chọn một mục để mở</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 px-4 pb-6 pt-2 overflow-y-auto">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 px-2 py-4 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-[#EFC14B] text-[#0F1E44] shadow-golden'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[26px] ${isActive ? 'fill' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className={`text-[11px] text-center leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compact bottom bar: home inline + everything else in the "Khác" cluster */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 bg-[#0F1E44] border-t border-[#1A2D5A] rounded-t-xl shadow-lg md:hidden">
        <button
          onClick={() => handleTabClick(homeTab.id)}
          className={`flex flex-col items-center justify-center transition-all duration-200 relative group ${
            activeTab === homeTab.id
              ? 'bg-[#EFC14B] text-[#0F1E44] rounded-full px-4 py-1.5 scale-95 font-semibold shadow-golden'
              : 'text-white/60 hover:text-white rounded-full px-3.5 py-1.5'
          }`}
        >
          <span className={`material-symbols-outlined text-[24px] ${activeTab === homeTab.id ? 'fill' : ''}`}>
            {homeTab.icon}
          </span>
          <span className={`text-[11px] tracking-wide mt-0.5 whitespace-nowrap ${activeTab === homeTab.id ? 'font-bold' : 'font-medium'}`}>
            {homeTab.label}
          </span>
        </button>

        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center transition-all duration-200 relative group ${
            moreActive
              ? 'bg-[#EFC14B] text-[#0F1E44] rounded-full px-4 py-1.5 scale-95 font-semibold shadow-golden'
              : 'text-white/60 hover:text-white rounded-full px-3.5 py-1.5'
          }`}
        >
          <div className="relative">
            <span className={`material-symbols-outlined text-[24px] ${moreActive ? 'fill' : ''}`}>
              {moreOpen ? 'close' : 'apps'}
            </span>

            {moreActive && pendingReviewCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#FF3131] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingReviewCount > 9 ? '9+' : pendingReviewCount}
              </span>
            )}
          </div>
          <span className={`text-[11px] tracking-wide mt-0.5 whitespace-nowrap ${moreActive ? 'font-bold' : 'font-medium'}`}>
            Khác
          </span>
        </button>
      </nav>
    </>
  );
};
