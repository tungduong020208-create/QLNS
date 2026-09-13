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

  // ─── Navigation grouping (UI-only) ───
  // Manager tools + "Đánh giá" collapse into one "Công vụ" group.
  // Pure navigation grouping: every tab keeps its own id, route, screen and
  // handler — only how they are reached from the menu changes.
  const groupTabs: { id: string; label: string; icon: string }[] = [
    ...(currentUser.role === 'manager'
      ? [
          { id: 'manager_schedule', label: 'Quản lý', icon: 'dashboard' },
          { id: 'work_hours', label: 'Giờ làm', icon: 'schedule' },
          { id: 'study_schedules', label: 'Lịch học NV', icon: 'school' },
          { id: 'export_report', label: 'Xuất báo cáo', icon: 'download' },
        ]
      : []),
    { id: 'peer_review', label: 'Đánh giá', icon: 'rate_review' },
  ];
  const groupTabIds = groupTabs.map(t => t.id);
  const groupActive = groupTabIds.includes(activeTab);
  // Start open when the user is on one of the grouped pages so the active
  // sub-tab is visible (the layout remounts on navigation, so this also
  // re-expands the group after moving between grouped pages).
  const [groupOpen, setGroupOpen] = React.useState(groupActive);

  const tabs: { id: string; label: string; icon: string }[] = [
    { id: 'home', label: currentUser.role === 'manager' ? 'Hôm nay' : 'Lịch & Công', icon: 'home' },
    ...groupTabs,
    { id: 'review', label: 'Bảng Tin', icon: 'handshake' },
    ...(currentUser.role !== 'manager'
      ? [{ id: 'study_schedule', label: 'Đăng ký lịch', icon: 'event_available' }]
      : []),
    { id: 'profile', label: 'Trang cá nhân', icon: 'person' },
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
          // Render grouped tabs as one collapsible section at the position
          // of the first group member; skip the remaining members.
          const groupIndex = groupTabIds.indexOf(tab.id);
          // Skip non-first members (they render inside the group section)
          if (groupIndex > 0) return null;
          // Collapse the group only when it has 2+ tabs; a single-member group
          // (e.g. employee view: just "Đánh giá") renders as a normal tab.
          if (groupIndex === 0 && groupTabs.length >= 2) {
            if (groupOpen) {
              return (
                <React.Fragment key="nav-group">
                  {groupTabs.map((sub) => {
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate(sub.id)}
                        className={`flex items-center justify-between p-3 pl-6 rounded-xl transition-all text-left group ${
                          isSubActive
                            ? 'bg-[#EFC14B] text-[#0F1E44] font-bold shadow-golden'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-[22px] ${isSubActive ? 'fill' : ''}`}>
                            {sub.icon}
                          </span>
                          <span className="text-sm font-medium">{sub.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            }
            return (
              <button
                key="nav-group"
                onClick={() => setGroupOpen(true)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                  groupActive
                    ? 'bg-[#EFC14B] text-[#0F1E44] font-bold shadow-golden'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[22px] ${groupActive ? 'fill' : ''}`}>
                    {groupActive ? 'dashboard' : 'grid_view'}
                  </span>
                  <span className="text-sm font-medium">Công vụ</span>
                </div>
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </button>
            );
          }

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
        <div className="font-heading font-semibold text-[#EFC14B] mb-0.5">AiiCafe HR</div>
        {currentUser.role !== 'manager' && (
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
        )}
      </div>
    </nav>
  );
};
