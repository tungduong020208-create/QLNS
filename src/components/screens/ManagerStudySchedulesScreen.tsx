import React, { useState, useMemo } from 'react';
import {
  User,
  StudySchedule,
  ManualShiftAssignment,
  WeeklyShiftRegistration,
} from '../../types';
import { Shift } from './ManagerScheduleScreen';
import { getShiftTimeRange } from '../../utils/constants';
import { getSlotAvailability } from '../../utils/autoSchedule';
import { computeBatchAutoSchedule, BatchAutoScheduleResult } from '../../utils/batchAutoSchedule';

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// 3 ca cố định — KHUNG GIỜ map động qua getShiftTimeRange() theo loại
// nhân viên được xếp (không còn bảng giờ cứng ở đây).
const SHIFT_NAMES = ['Ca sáng', 'Ca chiều', 'Ca tối'] as const;

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
  /** Unified schedule store — the SAME rows the engine auto-placed and the
   *  employee sees. Publish must read (and reconcile against) this, not a
   *  separate manager-only assignment history. */
  shifts: Shift[];
  onPublishSchedule: (assignment: ManualShiftAssignment) => void;
  onAddNotification: (notification: any) => void;
  /** Apply batch auto-schedule result directly to the shifts store. */
  onApplyBatchShifts: (shifts: Shift[]) => void;
}

export const ManagerStudySchedulesScreen: React.FC<ManagerStudySchedulesScreenProps> = ({
  currentUser,
  allUsers,
  studySchedules,
  registrations,
  manualAssignments,
  shifts,
  onPublishSchedule,
  onAddNotification,
  onApplyBatchShifts,
}) => {
  // `shifts` prop re-aliased: the local publish payload variable below is
  // also named `shifts`, so keep an unshadowed handle for store reads.
  const allShifts = shifts;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [assignShifts, setAssignShifts] = useState<Record<string, string>>({});
  const [batchResult, setBatchResult] = useState<BatchAutoScheduleResult | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [showBatchResult, setShowBatchResult] = useState(false);

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
    // Prefill from the LIVE schedule store (auto + manual rows of THIS
    // employee within the week), falling back to the published-assignment
    // record. Previously this pre-filled only the manager's own last
    // publish — so an employee's auto-placed week looked "unassigned" and
    // one publish silently wiped it (the week-wipe bug).
    const weekEndStr = toDateStr(new Date(currentMonday.getTime() + 6 * 86400000));
    const existing = shifts.filter(
      (s) => s.employeeId === employeeId &&
             s.date >= currentWeekStr && s.date <= weekEndStr &&
             s.status !== 'cancelled'
    );
    const initial: Record<string, string> = {};
    existing.forEach((s) => {
      initial[s.date] = s.shiftName;
    });
    if (Object.keys(initial).length === 0 && weekAssignment?.userId === employeeId) {
      weekAssignment.shifts.forEach((s) => {
        initial[s.date] = s.shiftName;
      });
    }
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
        // Giờ theo LOẠI NHÂN VIÊN đang được xếp (mục 2 & 4) — cùng quy tắc
        // với auto-scheduler nên hai đường ghi lịch luôn ra khung giờ nhất quán.
        const slot = shiftName === 'Ca sáng' ? 'morning' : shiftName === 'Ca chiều' ? 'afternoon' : 'evening';
        const tr = getShiftTimeRange(slot, employee.employmentType);
        return {
          date,
          shiftName: shiftName as string,
          startTime: tr.start,
          endTime: tr.end,
        };
      });

    // Dates where the employee HAD a shift but the modal leaves none:
    // publish must REMOVE those rows (per-date reconcile) instead of leaving
    // them dangling. Derived from the same live prefill, not from the
    // manager's previous assignment record.
    const weekEndStr = toDateStr(new Date(currentMonday.getTime() + 6 * 86400000));
    const clearedDates = allShifts
      .filter(
        (s) => s.employeeId === showAssignModal &&
               s.date >= currentWeekStr && s.date <= weekEndStr &&
               s.status !== 'cancelled' &&
               !assignShifts[s.date]
      )
      .map((s) => s.date);
    const uniqueCleared = Array.from(new Set(clearedDates));

    const assignment: ManualShiftAssignment = {
      id: weekAssignment?.id || `assign-${Date.now()}`,
      userId: showAssignModal,
      userName: employee.name,
      userAvatar: employee.avatar,
      weekStart: currentWeekStr,
      year: currentMonday.getFullYear(),
      weekNumber: currentWeekNum,
      shifts,
      clearedDates: uniqueCleared,
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

  // Handle batch auto-schedule
  const handleAutoSchedule = () => {
    setIsAutoScheduling(true);
    setTimeout(() => {
      const result = computeBatchAutoSchedule(
        allUsers,
        weekRegistrations,
        weekSchedules,
        shifts,
        currentWeekStr,
        [] // capacityOverrides — use defaults for now
      );
      setBatchResult(result);
      setShowBatchResult(true);
      setIsAutoScheduling(false);
    }, 300); // simulate processing
  };

  // Confirm and apply batch result
  const handleConfirmBatch = () => {
    const result = batchResult;
    if (!result) return;
    // Apply the batch result to the unified shifts store
    onApplyBatchShifts(result.shifts);
    // Notify all affected employees
    const affectedIds = new Set(result.shifts.filter(s => s.origin === 'auto').map(s => s.employeeId));
    affectedIds.forEach(userId => {
      const emp = allUsers.find(u => u.id === userId);
      if (emp) {
        onAddNotification({
          id: `notif-batch-${userId}-${Date.now()}`,
          title: 'Lịch làm việc đã được xếp tự động',
          message: `Lịch tuần ${currentWeekNum} của bạn đã được hệ thống xếp tự động`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          read: false,
          type: 'system',
          category: 'management',
          userId,
        });
      }
    });
    // Close modal — data already written to store via onApplyBatchShifts
    setShowBatchResult(false);
    setBatchResult(null);
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-4xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-[#0F1E44] mb-1">
              Lịch học & Xếp ca
            </h1>
            <p className="text-sm text-[#7A829A]">
              Xem lịch học bận và xếp lịch làm việc tự động hoặc thủ công
            </p>
          </div>
          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="px-4 py-2.5 bg-gradient-to-r from-[#4CAF72] to-[#3D9B63] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isAutoScheduling ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xếp...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                <span>Tự động xếp ca</span>
              </>
            )}
          </button>
        </div>
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
                        {/* 3 trạng thái: ca (navy S/C/T), XIN NGHỈ (vàng),
                            không đăng ký (xám '—') — quản lý nhìn là biết */}
                        <div className={`mt-0.5 rounded-md px-1 py-0.5 text-[8px] font-bold ${
                          day.shift === 'off' && day.type === 'leave'
                            ? 'bg-[#EFC14B]/25 text-[#D4A833]'
                            : day.shift === 'off'
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-[#0F1E44]/10 text-[#0F1E44]'
                        }`}>
                          {day.shift === 'off'
                            ? (day.type === 'leave' ? '🏖' : '—')
                            : day.shift === 'morning' ? 'S' : day.shift === 'afternoon' ? 'C' : 'T'}
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
                const isToday = toDateStr(new Date()) === dateStr;
                const selectedShift = assignShifts[dateStr] || '';

                // Study-busy info is ADVISORY only: the manager decides.
                const schedule = weekSchedules.find((s) => s.userId === showAssignModal);
                const daySchedule = schedule?.days.find((d) => d.day === day);
                const isBusy = daySchedule?.isBusy || false;

                // Đăng ký XIN NGHỈ của NV (type 'leave') — cũng chỉ mang tính
                // tham khảo: quản lý vẫn có thể gán ca, nhưng UI phải nói rõ
                // để quyết định là có chủ ý, không phải nhìn lộn ô trống.
                const regLeave = weekRegistrations
                  .find((r) => r.userId === showAssignModal)
                  ?.days.find((d) => d.date === dateStr)?.type === 'leave';

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
                      {selectedShift ? (
                        <>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4CAF72]/15 text-[#4CAF72]">
                            ✓ {selectedShift}
                          </span>
                          {(() => {
                            // Sức chứa còn lại của ca đang chọn — cùng nguồn số
                            // với engine (không truyền viewerId: manager nhìn
                            // tổng quan ghế thật, gồm cả hàng của nhân viên).
                            const av = getSlotAvailability(shifts, dateStr, selectedShift);
                            return (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                av.remaining === 0
                                  ? 'bg-[#FF3131]/15 text-[#FF3131]'
                                  : 'bg-[#0F1E44]/10 text-[#0F1E44]'
                              }`}>
                                {av.remaining}/{av.max} chỗ
                              </span>
                            );
                          })()}
                        </>
                      ) : regLeave ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFC14B]/25 text-[#D4A833]">
                          🏖 NV xin nghỉ
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-[#7A829A]">
                          Nghỉ
                        </span>
                      )}
                    </div>

                    {/* All 7 days assignable — rest day is whatever the manager
                        leaves unselected, not a hard-coded Sat/Sun. */}
                    <div className="flex gap-1.5">
                      {SHIFT_NAMES.map((name) => (
                        <button
                          key={name}
                          onClick={() => toggleAssignShift(dateStr, name)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            selectedShift === name
                              ? 'bg-[#0F1E44] text-white border-[#0F1E44]'
                              : 'bg-white text-[#7A829A] border-[#E8DFD0] hover:border-[#EFC14B]'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>

                    {isBusy && (
                      <p className="text-[10px] text-[#7A829A] mt-2">
                        ⚠️ Nhân viên đăng ký bận học ngày này
                      </p>
                    )}

                    {regLeave && selectedShift && (
                      <p className="text-[10px] text-[#D4A833] mt-2 font-semibold">
                        ⚠️ NV đã xin nghỉ ngày này — gán ca là ghi đè có chủ ý của quản lý.
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
                {weekAssignment?.userId === showAssignModal ? 'Cập nhật lịch' : 'Xuất bản lịch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Auto-Schedule Result Modal */}
      {showBatchResult && batchResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#F5EDDF]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#4CAF72]/15 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#4CAF72] text-xl">auto_fix_high</span>
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Kết quả xếp ca tự động</h3>
                    <p className="text-xs text-[#7A829A]">Tuần {currentWeekNum} — {formatWeekRange(currentMonday)}</p>
                  </div>
                </div>
                <button onClick={() => setShowBatchResult(false)} className="text-[#7A829A] hover:text-[#0F1E44]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="p-4 border-b border-[#F5EDDF] bg-[#FDF8EE]">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-[#0F1E44]">{batchResult.summary.totalAssigned}</p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Đã xếp</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-[#4CAF72]">{batchResult.summary.filledSlots}</p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Ca đủ người</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-[#FF3131]">{batchResult.summary.understaffedSlots}</p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Ca thiếu người</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-[#EFC14B]">{batchResult.slotResults.length}</p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Tổng ca</p>
                </div>
              </div>
            </div>

            {/* Result Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-bold text-[#0F1E44] mb-3">Bảng xếp ca theo ngày</h4>
              
              {/* Group by date */}
              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((dayLabel, dayIdx) => {
                const date = new Date(currentMonday);
                date.setDate(currentMonday.getDate() + dayIdx);
                const dateStr = toDateStr(date);
                const daySlots = batchResult.slotResults.filter(s => s.date === dateStr);
                const hasWarning = daySlots.some(s => s.isUnderstaffed);

                return (
                  <div key={dateStr} className={`mb-4 p-3 rounded-xl border ${hasWarning ? 'border-[#FF3131]/30 bg-[#FF3131]/5' : 'border-[#E8DFD0] bg-white'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-bold ${hasWarning ? 'text-[#FF3131]' : 'text-[#0F1E44]'}`}>{dayLabel}</span>
                      <span className="text-xs text-[#7A829A]">{date.getDate()}/{date.getMonth() + 1}</span>
                      {hasWarning && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF3131]/15 text-[#FF3131]">
                          ⚠️ Thiếu người
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {daySlots.map((slot) => (
                        <div key={slot.shiftName} className={`p-2 rounded-lg border ${slot.isUnderstaffed ? 'border-[#FF3131]/30 bg-[#FF3131]/5' : 'border-[#4CAF72]/30 bg-[#4CAF72]/5'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#0F1E44]">{slot.shiftName}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.isUnderstaffed ? 'bg-[#FF3131]/15 text-[#FF3131]' : 'bg-[#4CAF72]/15 text-[#4CAF72]'}`}>
                              {slot.assignedUsers.length}/{slot.capacity}
                            </span>
                          </div>
                          {slot.isUnderstaffed && (
                            <p className="text-[9px] text-[#FF3131] font-semibold">
                              Thiếu {slot.missingCount} người
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Understaffed Warnings */}
              {batchResult.understaffedWarnings.length > 0 && (
                <div className="mt-4 p-4 bg-[#FF3131]/5 border border-[#FF3131]/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#FF3131] text-lg">warning</span>
                    <h4 className="text-sm font-bold text-[#FF3131]">Cảnh báo thiếu người</h4>
                  </div>
                  <div className="space-y-2">
                    {batchResult.understaffedWarnings.map((w, idx) => {
                      const d = new Date(w.date + 'T00:00:00');
                      return (
                        <p key={idx} className="text-xs text-[#FF3131]">
                          • {w.shiftName} ngày {d.getDate()}/{d.getMonth() + 1}: thiếu {w.missingCount} người ({w.assignedUsers.length}/{w.capacity})
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#F5EDDF] flex gap-2">
              <button
                onClick={() => setShowBatchResult(false)}
                className="flex-1 h-10 border border-[#E8DFD0] text-[#7A829A] rounded-xl text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBatch}
                className="flex-1 h-10 bg-[#4CAF72] text-white rounded-xl text-xs font-bold hover:bg-[#3D9B63]"
              >
                Xác nhận & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
