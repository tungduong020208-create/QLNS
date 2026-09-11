import React, { useState } from 'react';
import { User, NotificationItem, WeeklyShiftRegistration } from '../../types';
import { Shift } from './ManagerScheduleScreen';
import { ManagerScheduleScreen } from './ManagerScheduleScreen';
import { ShiftRegistrationScreen } from './ShiftRegistrationScreen';

interface ManagerScheduleTabProps {
  currentUser: User;
  allUsers: User[];
  // Shifts
  shifts: Shift[];
  onAddShift: (shift: Shift) => void;
  onUpdateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  // Registrations
  registrations: WeeklyShiftRegistration[];
  onSubmitRegistration: (reg: WeeklyShiftRegistration) => void;
  onUpdateRegistration: (reg: WeeklyShiftRegistration) => void;
  onAddNotification: (notification: NotificationItem) => void;
}

type SubTab = 'shifts' | 'weekly';

export const ManagerScheduleTab: React.FC<ManagerScheduleTabProps> = ({
  currentUser,
  allUsers,
  shifts,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  registrations,
  onSubmitRegistration,
  onUpdateRegistration,
  onAddNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('shifts');

  const pendingRegCount = registrations.filter((r) => r.status === 'submitted').length;

  const subTabs: { id: SubTab; label: string; icon: string; badge?: number }[] = [
    { id: 'shifts', label: 'Ca làm', icon: 'calendar_month' },
    { id: 'weekly', label: 'Đăng ký tuần', icon: 'event_available', badge: pendingRegCount > 0 ? pendingRegCount : undefined },
  ];

  return (
    <div className="pb-28 pt-20 px-4 max-w-4xl mx-auto w-full antialiased">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 mb-5 bg-[#F5EDDF] rounded-xl p-1">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === tab.id
                ? 'bg-[#0F1E44] text-white shadow-sm'
                : 'text-[#7A829A] hover:text-[#0F1E44]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] align-middle">{tab.icon}</span>
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] bg-[#FF3131] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content — render inline without duplicate wrappers */}
      {activeSubTab === 'shifts' && (
        <ManagerScheduleScreen
          currentUser={currentUser}
          allUsers={allUsers}
          shifts={shifts}
          onAddShift={onAddShift}
          onUpdateShift={onUpdateShift}
          onDeleteShift={onDeleteShift}
          onAddNotification={onAddNotification}
        />
      )}

      {activeSubTab === 'weekly' && (
        <ShiftRegistrationScreen
          currentUser={currentUser}
          allUsers={allUsers}
          registrations={registrations}
          onSubmitRegistration={onSubmitRegistration}
          onUpdateRegistration={onUpdateRegistration}
          onAddNotification={onAddNotification}
        />
      )}
    </div>
  );
};
