import React, { useState, useMemo } from 'react';
import {
  User,
  StudySchedule,
  ManualShiftAssignment,
  WeeklyShiftRegistration,
} from '../../types';

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SHIFT_TEMPLATES = [
  { name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  { name: 'Ca chiều', startTime: '13:00', endTime: '18:00' },
  { name: 'Ca tối', startTime: '18:00', endTime: '22:00' },
];

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
};

interface ManagerStudySchedulesScreenProps {
  currentUser: User;
  allUsers: User[];
  studySchedules: StudySchedule[];
  registrations: WeeklyShiftRegistration[];
  manualAssignments: ManualShiftAssignment[];
  onPublishSchedule: (assignment: ManualShiftAssignment) => void;
  onAddNotification: (notification: any) => void;
}

export const ManagerStudySchedulesScreen: React.FC<ManagerStudySchedulesScreenProps> = ({
  currentUser,
  allUsers,
  studySchedules,
  registrations,
  manualAssignments,
  onPublishSchedule,
  onAddNotification,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [assignShifts, setAssignShifts] = useState<Record<string, string>>({});

  const currentMonday = useMemo(() => {
    const base = new Date();
    const monday = getMonday(base);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  const currentWeekStr = useMemo(() => toDateStr(currentMonday), [currentMonday]);
  const currentWeekNum = useMemo(() => getISOWeekNumber(currentMonday), [currentMonday]);

  // Get schedules for current week
  const weekSchedules = useMemo(() => {
    return studySchedules.filter((s) => s.weekStart === currentWeekStr);
  }, [studySchedules, currentWeekStr]);

  // Get registrations for current week
  const weekRegistrations = useMemo(() => {
    return registrations.filter((r) => r.weekStart === currentWeekStr);
  }, [registrations, currentWeekStr]);

  // Get manual assignment for current week
  const weekAssignment = useMemo(() => {
    return manualAssignments.find((a) => a.weekStart === currentWeekStr);
  }, [manualAssignments, currentWeekStr]);

  // Get employees who submitted study schedules
  const employees = useMemo(() => {
    return allUsers.filter((u) => u.role !== 'manager');
  }, [allUsers]);

  const submittedEmployees = useMemo(() => {
    return weekSchedules.map((s) => s.userId);
  }, [weekSchedules]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const submitted = submittedEmployees.length;
    const withShiftPrefs = weekRegistrations.length;
    return { total, submitted, withShiftPrefs };
  }, [employees, submittedEmployees, weekRegistrations]);

  // Selected employee details
  const selectedSchedule = useMemo(() => {
    if (!selectedEmployee) return null;
    return weekSchedules.find((s) => s.userId === selectedEmployee) || null;
  }, [selectedEmployee, weekSchedules]);

  const selectedRegistration = useMemo(() => {
    if (!selectedEmployee) return null;
    return weekRegistrations.find((r) => r.userId === selectedEmployee) || null;
  }, [selectedEmployee, weekRegistrations]);

  // Initialize assign shifts when opening modal
  const openAssignModal = (employeeId: string) => {
    setShowAssignModal(employeeId);
    const existing = weekAssignment?.shifts.filter((s) => {
      const emp = employees.find((e) => e.id === employeeId);
      return emp; // Will filter by userId when publishing
    }) || [];
    const initial: Record<string, string> = {};
    existing.forEach((s) => {
      initial[s.date] = s.shiftName;
    });
    setAssignShifts(initial);
  };

  const toggleAssignShift = (date: string, shiftName: string) => {
    setAssignShifts((prev) => ({
      ...prev,
      [date]: prev[date] === shiftName ? '' : shiftName,
    }));
  };

  const handlePublish = () => {
    if (!showAssignModal) return;

    const employee = employees.find((e) => e.id === showAssignModal);
    if (!employee) return;

    const shifts = Object.entries(assignShifts)
      .filter(([_, shiftName]) => shiftName !== '')
      .map(([date, shiftName]) => {
        const template = SHIFT_TEMPLATES.find((t) => t.name === shiftName);
        return {
          date,
          shiftName: shiftName as string,
          startTime: template?.startTime || '07:00',
          endTime: template?.endTime || '12:00',
        };
      });

    const assignment: ManualShiftAssignment = {
      id: weekAssignment?.id || `assign-${Date.now()}`,
      userId: showAssignModal,
      userName: employee.name,
      userAvatar: employee.avatar,
      weekStart: currentWeekStr,
      year: currentMonday.getFullYear(),
      weekNumber: currentWeekNum,
      shifts,
      publishedAt: new Date().toISOString(),
      publishedBy: currentUser.name,
    };

    onPublishSchedule(assignment);
    setShowAssignModal(null);

    // Notify employee
    onAddNotification({
      id: `notif-schedule-${Date.now()}`,
      title: 'Lịch làm việc đã được xuất bản',
      message: `Lịch tuần ${currentWeekNum}/${currentMonday.getFullYear()} của bạn đã được Quản lý xếp`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: 'system',
      category: 'management',
      userId: showAssignModal,
    });
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-4xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-[#0F1E44] mb-1">
          Lịch học & Xếp ca thủ công
        </h1>
        <p className="text-sm text-[#7A829A]">
          Xem lịch học bận của nhân viên và xếp lịch làm việc thủ công
        </p>
      </div>

      {/* Week Navigator */}
      <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <div className="text-center">
            <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">
              Tuần {currentWeekNum} / {currentMonday.getFullYear()}
            </p>
            <p className="text-white font-heading font-bold text-base">
              {formatWeekRange(currentMonday)}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#0F1E44]">{stats.total}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tổng nhân viên</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#4CAF72]">{stats.submitted}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Đã gửi lịch học</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#EFC14B]">{stats.withShiftPrefs}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Đăng ký ca</p>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-sm overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-[#F5EDDF]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0F1E44] text-lg">group</span>
            <h3 className="text-sm font-bold text-[#0F1E44]">Danh sách nhân viên</h3>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">person_off</span>
            <p className="text-sm text-[#7A829A] font-medium">Không có nhân viên nào</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5EDDF]">
            {employees.map((emp) => {
              const hasSubmitted = submittedEmployees.includes(emp.id);
              const hasReg = weekRegistrations.some((r) => r.userId === emp.id);
              const hasAssignment = weekAssignment?.userId === emp.id;

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp.id)}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedEmployee === emp.id ? 'bg-[#EFC14B]/10' : 'hover:bg-[#FDF8EE]'
                  }`}
                >
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#E8DFD0]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F1E44] truncate">{emp.name}</p>
                    <p className="text-[10px] text-[#7A829A]">{emp.employeeCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSubmitted && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#4CAF72]/15 text-[#4CAF72]">
                        📚 Lịch học
                      </span>
                    )}
                    {hasReg && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EFC14B]/20 text-[#D4A833]">
                        📅 Ca làm
                      </span>
                    )}
                    {hasAssignment && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0F1E44]/10 text-[#0F1E44]">
                        ✓ Đã xếp
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssignModal(emp.id);
                    }}
                    className="px-3 py-1.5 bg-[#0F1E44] text-white rounded-lg text-xs font-bold hover:bg-[#1A2D5A] transition-colors"
                  >
                    Xếp ca
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#F5EDDF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedSchedule.userAvatar}
                  alt={selectedSchedule.userName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#EFC14B]"
                />
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#0F1E44]">
                    {selectedSchedule.userName}
                  </h3>
                  <p className="text-xs text-[#7A829A]">Tuần {selectedSchedule.weekNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-[#FDF8EE] rounded-lg"
              >
                <span className="material-symbols-outlined text-[#7A829A]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-bold text-[#0F1E44] mb-3">📚 Lịch học bận</h4>
              <div className="space-y-2 mb-4">
                {selectedSchedule.days.map((day, idx) => (
                  <div
                    key={day.day}
                    className={`p-2 rounded-lg border ${
                      day.isBusy ? 'bg-[#FF3131]/5 border-[#FF3131]/30' : 'bg-[#4CAF72]/5 border-[#4CAF72]/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F1E44]">{DAY_LABELS[idx]}</span>
                      {day.isBusy ? (
                        <span className="text-[10px] text-[#FF3131] font-semibold">Bận học</span>
                      ) : (
                        <span className="text-[10px] text-[#4CAF72] font-semibold">Rảnh</span>
                      )}
                    </div>
                    {day.isBusy && day.timeSlots.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {day.timeSlots.map((slot, i) => (
                          <p key={i} className="text-[10px] text-[#7A829A]">
                            {slot.startTime} - {slot.endTime} {slot.subject && `(${slot.subject})`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedRegistration && (
                <>
                  <h4 className="text-sm font-bold text-[#0F1E44] mb-3">📅 Đăng ký ca làm</h4>
                  <div className="grid grid-cols-7 gap-1">
                    {selectedRegistration.days.map((day, idx) => (
                      <div key={day.date} className="text-center">
                        <p className="text-[8px] text-[#7A829A] uppercase">{DAY_LABELS[idx].replace('Thứ ', 'T')}</p>
                        <p className="text-[9px] text-[#7A829A]">{day.date.split('-')[2]}</p>
                        <div className={`mt-0.5 rounded-md px-1 py-0.5 text-[8px] font-bold ${
                          day.shift === 'off' ? 'bg-gray-100 text-gray-400' : 'bg-[#0F1E44]/10 text-[#0F1E44]'
                        }`}>
                          {day.shift === 'off' ? 'Nghỉ' : day.shift === 'morning' ? 'S' : day.shift === 'afternoon' ? 'C' : 'T'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#F5EDDF] flex gap-2">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE] border border-[#E8DFD0]"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  openAssignModal(selectedSchedule.userId);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A]"
              >
                Xếp ca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#F5EDDF]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Xếp ca thủ công</h3>
                <button onClick={() => setShowAssignModal(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const emp = employees.find((e) => e.id === showAssignModal);
                  return emp ? (
                    <>
                      <img src={emp.avatar} alt={emp.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm font-semibold text-[#0F1E44]">{emp.name}</span>
                    </>
                  ) : null;
                })()}
                <span className="text-xs text-[#7A829A]">— Tuần {currentWeekNum}</span>
              </div>
            </div>

            {/* Shift Assignment */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-[#7A829A] mb-3">
                Chọn ca làm việc cho từng ngày trong tuần:
              </p>

              {DAY_KEYS.map((day, idx) => {
                const date = new Date(currentMonday);
                date.setDate(currentMonday.getDate() + idx);
                const dateStr = toDateStr(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = toDateStr(new Date()) === dateStr;
                const selectedShift = assignShifts[dateStr] || '';

                // Check if employee is busy studying this day
                const schedule = weekSchedules.find((s) => s.userId === showAssignModal);
                const daySchedule = schedule?.days.find((d) => d.day === day);
                const isBusy = daySchedule?.isBusy || false;

                return (
                  <div
                    key={dateStr}
                    className={`mb-3 p-3 rounded-xl border ${
                      isBusy
                        ? 'bg-[#FF3131]/5 border-[#FF3131]/30'
                        : isToday
                        ? 'bg-[#EFC14B]/10 border-[#EFC14B]'
                        : 'bg-white border-[#E8DFD0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isToday ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                          {DAY_LABELS[idx]}
                        </span>
                        <span className="text-xs text-[#7A829A]">
                          {date.getDate()}/{date.getMonth() + 1}
                        </span>
                        {isBusy && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3131]/15 text-[#FF3131]">
                            📚 Bận học
                          </span>
                        )}
                      </div>
                      {selectedShift && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4CAF72]/15 text-[#4CAF72]">
                          ✓ {selectedShift}
                        </span>
                      )}
                    </div>

                    {!isWeekend && !isBusy && (
                      <div className="flex gap-1.5">
                        {SHIFT_TEMPLATES.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => toggleAssignShift(dateStr, template.name)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                              selectedShift === template.name
                                ? 'bg-[#0F1E44] text-white border-[#0F1E44]'
                                : 'bg-white text-[#7A829A] border-[#E8DFD0] hover:border-[#EFC14B]'
                            }`}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {(isWeekend || isBusy) && (
                      <p className="text-xs text-[#7A829A] text-center">
                        {isWeekend ? 'Ngày nghỉ' : 'Nhân viên bận học'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#F5EDDF] flex gap-2">
              <button
                onClick={() => setShowAssignModal(null)}
                className="flex-1 h-10 border border-[#E8DFD0] text-[#7A829A] rounded-xl text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 h-10 bg-[#4CAF72] text-white rounded-xl text-xs font-bold hover:bg-[#3D9B63]"
              >
                Xuất bản lịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
