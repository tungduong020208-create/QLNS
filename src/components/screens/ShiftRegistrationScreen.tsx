import React, { useState, useMemo, useCallback } from 'react';
import {
  User,
  NotificationItem,
  WeeklyShiftRegistration,
  DayShiftRegistration,
  ShiftSlot,
} from '../../types';

// ─── Constants ───
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
/** Nhãn ngắn cho bảng lưới: T2…T7, CN. */
const DAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const SHIFT_OPTIONS: { value: ShiftSlot; label: string; color: string; icon: string }[] = [
  { value: 'morning', label: 'Ca sáng', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'wb_sunny' },
  { value: 'afternoon', label: 'Ca chiều', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'wb_twilight' },
  { value: 'evening', label: 'Ca tối', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'dark_mode' },
  { value: 'off', label: 'Nghỉ', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: 'event_busy' },
];

/** 4 nút của bảng đăng ký — đúng thứ tự cột mẫu: Sáng · Chiều · Tối · Nghỉ Off. */
const SHIFT_BUTTONS: { value: ShiftSlot; label: string }[] = [
  { value: 'morning', label: 'Sáng' },
  { value: 'afternoon', label: 'Chiều' },
  { value: 'evening', label: 'Tối' },
  { value: 'off', label: 'Nghỉ Off' },
];

// ─── Helpers ───
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

const getNextMonday = (): Date => {
  const today = new Date();
  const monday = getMonday(today);
  monday.setDate(monday.getDate() + 7);
  return monday;
};

const getWeekDays = (monday: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const isFormOpen = (): { open: boolean; message: string } => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // Fri=5, Sat=6, Sun=0 → form is open
  if (day === 5 || day === 6 || day === 0) {
    return { open: true, message: '' };
  }

  return {
    open: false,
    message: 'Hệ thống đăng ký lịch tuần tiếp theo chỉ mở từ Thứ 6 đến Chủ nhật hàng tuần',
  };
};

/**
 * Check for shift overlap within a registration.
 * An employee cannot register two non-'off' shifts on the same day.
 * Returns an array of conflicting dates.
 */
const checkShiftOverlap = (days: DayShiftRegistration[]): string[] => {
  const conflicts: string[] = [];
  const seen = new Map<string, ShiftSlot>();
  for (const day of days) {
    if (day.shift === 'off') continue;
    if (seen.has(day.date)) {
      conflicts.push(day.date);
    } else {
      seen.set(day.date, day.shift);
    }
  }
  return conflicts;
};

const getShiftInfo = (slot: ShiftSlot) =>
  SHIFT_OPTIONS.find((o) => o.value === slot) || SHIFT_OPTIONS[3];

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
};

/** "Tuần 28/09 - 04/10/2026" — đầu tuần → cuối tuần (kèm năm, đủ 2 chữ số). */
const formatWeekFull = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Tuần ${fmt(monday)} - ${fmt(sunday)}/${sunday.getFullYear()}`;
};

// ─── Props ───
interface ShiftRegistrationScreenProps {
  currentUser: User;
  allUsers: User[];
  registrations: WeeklyShiftRegistration[];
  onSubmitRegistration: (reg: WeeklyShiftRegistration) => void;
  onUpdateRegistration: (reg: WeeklyShiftRegistration) => void;
  onAddNotification: (notification: NotificationItem) => void;
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export const ShiftRegistrationScreen: React.FC<ShiftRegistrationScreenProps> = ({
  currentUser,
  allUsers,
  registrations,
  onSubmitRegistration,
  onUpdateRegistration,
  onAddNotification,
}) => {
  const isManager = currentUser.role === 'manager';
  const formCheck = useMemo(() => isFormOpen(), []);

  // ─── Employee state ───
  const targetWeekMonday = useMemo(() => getNextMonday(), []);
  const targetWeekStr = useMemo(() => toDateStr(targetWeekMonday), [targetWeekMonday]);
  const targetWeekDays = useMemo(() => getWeekDays(targetWeekMonday), [targetWeekMonday]);
  const targetWeekNum = useMemo(() => getISOWeekNumber(targetWeekMonday), [targetWeekMonday]);
  const targetYear = targetWeekMonday.getFullYear();

  // Check if employee already has a registration for this week
  const existingReg = useMemo(() => {
    return registrations.find(
      (r) => r.userId === currentUser.id && r.weekStart === targetWeekStr
    );
  }, [registrations, currentUser.id, targetWeekStr]);

  // Day selections for employee form
  const [daySelections, setDaySelections] = useState<DayShiftRegistration[]>(() => {
    if (existingReg) return existingReg.days;
    return targetWeekDays.map((d, i) => ({
      date: toDateStr(d),
      dayLabel: DAY_LABELS[i],
      shift: 'off' as ShiftSlot,
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  // ─── Manager state ───
  const [managerWeekOffset, setManagerWeekOffset] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReg, setSelectedReg] = useState<WeeklyShiftRegistration | null>(null);
  const [editDaySelections, setEditDaySelections] = useState<DayShiftRegistration[]>([]);

  // Manager's target week
  const managerTargetMonday = useMemo(() => {
    const base = getNextMonday();
    base.setDate(base.getDate() + managerWeekOffset * 7);
    return base;
  }, [managerWeekOffset]);

  const managerTargetStr = useMemo(() => toDateStr(managerTargetMonday), [managerTargetMonday]);

  const managerRegistrations = useMemo(() => {
    return registrations
      .filter((r) => r.weekStart === managerTargetStr)
      .filter((r) => filterStatus === 'all' || r.status === filterStatus)
      .sort((a, b) => a.userName.localeCompare(b.userName, 'vi'));
  }, [registrations, managerTargetStr, filterStatus]);

  // ─── Employee handlers ───
  const handleShiftChange = useCallback((date: string, shift: ShiftSlot) => {
    setDaySelections((prev) =>
      prev.map((d) => (d.date === date ? { ...d, shift } : d))
    );
    // Clear overlap warning when user makes changes
    setOverlapWarning(null);
  }, []);

  const handleSubmit = () => {
    if (!formCheck.open && !isManager) return;

    // Check for shift overlaps before submitting
    const internalOverlaps = checkShiftOverlap(daySelections);
    if (internalOverlaps.length > 0) {
      setOverlapWarning('Bạn đã đăng ký nhiều ca trong cùng ngày. Vui lòng kiểm tra lại.');
      return;
    }

    setOverlapWarning(null);
    setIsSaving(true);

    const now = new Date().toISOString();
    const reg: WeeklyShiftRegistration = {
      id: existingReg?.id || `reg-${crypto.randomUUID()}-${currentUser.id}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      weekStart: targetWeekStr,
      year: targetYear,
      weekNumber: targetWeekNum,
      days: daySelections,
      status: 'submitted',
      submittedAt: now,
      createdAt: existingReg?.createdAt || now,
      updatedAt: now,
    };

    setTimeout(() => {
      if (existingReg) {
        onUpdateRegistration(reg);
      } else {
        onSubmitRegistration(reg);
      }
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 400);
  };

  // ─── Manager handlers ───
  const handleManagerEdit = (reg: WeeklyShiftRegistration) => {
    setSelectedReg(reg);
    setEditDaySelections([...reg.days]);
  };

  const handleManagerSave = () => {
    if (!selectedReg) return;
    const updated: WeeklyShiftRegistration = {
      ...selectedReg,
      days: editDaySelections,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRegistration(updated);
    setSelectedReg(null);
  };

  const handleManagerDayChange = (date: string, shift: ShiftSlot) => {
    setEditDaySelections((prev) =>
      prev.map((d) => (d.date === date
        // Type phải theo trạng thái mới: shift != 'off' → 'shift';
        // 'off' do manager chủ động chọn → giữ 'leave' nếu ngày đó đang leave.
        ? { ...d, shift, type: shift !== 'off' ? 'shift' : d.type }
        : d))
    );
  };

  // ─── Stats for manager ───
  const stats = useMemo(() => {
    const total = managerRegistrations.length;
    const submitted = managerRegistrations.filter((r) => r.status === 'submitted').length;
    return { total, submitted };
  }, [managerRegistrations]);

  // ═══════════════════════════════════════════════════
  // Employee View
  // ═══════════════════════════════════════════════════
  if (!isManager) {
    return (
      <div className="pb-safe-bottom pt-safe-top px-4 max-w-3xl mx-auto w-full antialiased">
        {/* Header — thanh tuần + trạng thái mở/khóa (theo mẫu thiết kế) */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-xl font-bold text-[#0F1E44]">
            {formatWeekFull(targetWeekMonday)}
          </h2>
          <span
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold ${
              formCheck.open
                ? 'bg-[#4CAF72]/15 text-[#4CAF72]'
                : 'bg-[#FF3131]/10 text-[#FF3131]'
            }`}
          >
            {formCheck.open ? 'Đang mở' : 'Đã khóa'}
          </span>
        </div>
        <p className="text-xs text-[#7A829A] mb-4 leading-relaxed">
          Không cần giải thích lý do nghỉ. Chọn{' '}
          <strong className="text-[#FF3131]">OFF</strong> để nghỉ trọn ngày (bao gồm
          cuối tuần), hoặc chọn các khung giờ bạn muốn đi làm.
        </p>

        {/* Success message */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-[#4CAF72]/15 text-[#4CAF72] text-sm font-semibold rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Đã lưu lịch đăng ký thành công!
          </div>
        )}

        {/* Overlap warning */}
        {overlapWarning && (
          <div className="mb-4 p-3 bg-[#FF3131]/10 border border-[#FF3131]/30 text-[#FF3131] text-sm font-semibold rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            {overlapWarning}
          </div>
        )}

        {/* Week info card */}
        <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">
                Tuần đăng ký
              </p>
              <p className="text-white font-heading font-bold text-lg">
                Tuần {targetWeekNum}
              </p>
              <p className="text-white/80 text-xs">{formatWeekRange(targetWeekMonday)}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">calendar_month</span>
            </div>
          </div>
        </div>

        {/* Form locked — giải thích khung thời gian mở */}
        {!formCheck.open && (
          <div className="bg-[#FF3131]/10 border border-[#FF3131]/30 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#FF3131] text-xl mt-0.5">lock</span>
            <div>
              <h4 className="text-sm font-bold text-[#FF3131] mb-1">Form đã khóa</h4>
              <p className="text-xs text-[#7A829A]">{formCheck.message}</p>
            </div>
          </div>
        )}

        {/* Form open — nhãn khung giờ gọn */}
        {formCheck.open && (
          <div className="bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-2xl px-3 py-2 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4CAF72] text-lg">check_circle</span>
            <p className="text-xs font-semibold text-[#4CAF72]">
              Đang mở — Thứ 6 đến Chủ nhật, đăng ký lịch tuần tới
            </p>
          </div>
        )}

        {/* Existing registration status */}
        {existingReg && (
          <div className={`rounded-2xl p-3 mb-4 flex items-center gap-2 ${
            existingReg.status === 'approved'
              ? 'bg-[#4CAF72]/10 border border-[#4CAF72]/30'
              : existingReg.status === 'rejected'
              ? 'bg-[#FF3131]/10 border border-[#FF3131]/30'
              : 'bg-[#EFC14B]/10 border border-[#EFC14B]/30'
          }`}>
            <span className={`material-symbols-outlined text-lg ${
              existingReg.status === 'approved'
                ? 'text-[#4CAF72]'
                : existingReg.status === 'rejected'
                ? 'text-[#FF3131]'
                : 'text-[#EFC14B]'
            }`}>
              {existingReg.status === 'approved'
                ? 'check_circle'
                : existingReg.status === 'rejected'
                ? 'cancel'
                : 'schedule'}
            </span>
            <div>
              <p className={`text-xs font-bold ${
                existingReg.status === 'approved'
                  ? 'text-[#4CAF72]'
                  : existingReg.status === 'rejected'
                  ? 'text-[#FF3131]'
                  : 'text-[#0F1E44]'
              }`}>
                {existingReg.status === 'approved'
                  ? 'Lịch đã được lưu'
                  : existingReg.status === 'rejected'
                  ? 'Lịch chưa được duyệt'
                  : 'Đã gửi — chờ quản lý xác nhận'}
              </p>
              {existingReg.managerNote && (
                <p className="text-[10px] text-[#7A829A] mt-0.5">
                  Ghi chú: {existingReg.managerNote}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bảng đăng ký theo lưới — hàng: ngày, cột: Sáng/Chiều/Tối/Off */}
        <div className="bg-white rounded-2xl border border-[#E8DFD0] p-3 mb-4">
          {/* Header row */}
          <div className="grid grid-cols-[52px_repeat(4,1fr)] gap-1.5 mb-2">
            <span className="text-[10px] font-bold text-[#7A829A] uppercase flex items-center">Thứ / Ngày</span>
            {SHIFT_BUTTONS.map((b) => (
              <span
                key={b.value}
                className={`text-[10px] font-bold uppercase text-center flex items-center justify-center ${
                  b.value === 'off' ? 'text-[#FF3131]' : 'text-[#7A829A]'
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* Day rows */}
          <div className="space-y-1.5">
            {targetWeekDays.map((day, idx) => {
              const dateStr = toDateStr(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const locked = isWeekend || !formCheck.open; // cuối tuần luôn Off
              const selected = daySelections.find((d) => d.date === dateStr)?.shift || 'off';

              return (
                <div
                  key={dateStr}
                  className={`grid grid-cols-[52px_repeat(4,1fr)] gap-1.5 rounded-xl px-1 py-1.5 ${
                    isWeekend ? 'bg-[#FF3131]/5' : ''
                  }`}
                >
                  {/* Ngày */}
                  <div className="flex flex-col justify-center px-1">
                    <span className={`text-xs font-bold leading-tight ${
                      isWeekend ? 'text-[#FF3131]' : 'text-[#0F1E44]'
                    }`}>
                      {DAY_SHORT[idx]}
                    </span>
                    <span className="text-[10px] text-[#7A829A] leading-tight">
                      {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* 4 nút ca */}
                  {SHIFT_BUTTONS.map((b) => {
                    const active = selected === b.value;
                    if (locked) {
                      // Ô khóa: nút Off ép active (cuối tuần), còn lại mờ đi
                      return (
                        <button
                          key={b.value}
                          type="button"
                          disabled
                          tabIndex={-1}
                          className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                            isWeekend && b.value === 'off'
                              ? 'bg-[#FF3131] text-white border-[#FF3131]'
                              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => handleShiftChange(dateStr, b.value)}
                        aria-pressed={active}
                        className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          b.value === 'off'
                            ? active
                              ? 'bg-[#FF3131] text-white border-[#FF3131] shadow-sm'
                              : 'bg-white text-[#FF3131]/70 border-[#FF3131]/30 hover:bg-[#FF3131]/5'
                            : active
                            ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm'
                            : 'bg-white text-[#7A829A] border-[#E8DFD0] hover:border-[#1D4ED8]/50'
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        {formCheck.open && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>{existingReg ? 'Cập nhật lịch' : 'Đăng ký lịch'}</span>
              </>
            )}
          </button>
        )}

        {/* Info note */}
        <div className="mt-4 bg-[#FDF8EE] border border-[#E8DFD0] rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#EFC14B] text-xl mt-0.5">info</span>
          <div>
            <h4 className="text-sm font-bold text-[#0F1E44] mb-1">Quy tắc đăng ký</h4>
            <ul className="text-xs text-[#7A829A] space-y-1">
              <li>• Đăng ký lịch cho <strong>Tuần tiếp theo</strong> (không phải tuần hiện tại)</li>
              <li>• Form mở từ <strong>Thứ 6 đến Chủ nhật</strong> hàng tuần</li>
              <li>• Ngoài thời gian trên, form sẽ bị khóa</li>
              <li>• Bạn có thể chỉnh sửa lịch đã đăng ký trong khung giờ cho phép</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // Manager View
  // ═══════════════════════════════════════════════════
  return (
    <div className="pb-safe-bottom pt-safe-top px-4 max-w-4xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Quản lý lịch làm việc</h2>
        <p className="text-xs text-[#7A829A] mt-0.5">
          Xem và chỉnh sửa lịch đăng ký ca làm của nhân viên
        </p>
      </div>

      {/* Week navigator */}
      <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setManagerWeekOffset((p) => p - 1)}
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <div className="text-center">
            <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">
              Tuần {getISOWeekNumber(managerTargetMonday)} / {managerTargetMonday.getFullYear()}
            </p>
            <p className="text-white font-heading font-bold text-base">
              {formatWeekRange(managerTargetMonday)}
            </p>
          </div>
          <button
            onClick={() => setManagerWeekOffset((p) => p + 1)}
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
          <p className="text-xl font-heading font-bold text-[#0F1E44]">{stats.total}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tổng đăng ký</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
          <p className="text-xl font-heading font-bold text-[#EFC14B]">{stats.submitted}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Đang chờ</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'Tất cả' },
          { value: 'submitted', label: 'Đang chờ' },
          { value: 'approved', label: 'Đã xác nhận' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filterStatus === f.value
                ? 'bg-[#0F1E44] text-white shadow-sm'
                : 'bg-[#F5EDDF] text-[#7A829A] hover:text-[#0F1E44]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Registration list */}
      {managerRegistrations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8DFD0] p-10 text-center">
          <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">calendar_month</span>
          <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có đăng ký</h3>
          <p className="text-xs text-[#7A829A]">
            {filterStatus === 'all'
              ? 'Chưa có nhân viên nào đăng ký lịch cho tuần này.'
              : 'Không có đăng ký phù hợp với bộ lọc.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {managerRegistrations.map((reg) => (
            <div
              key={reg.id}
              className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm"
            >
              {/* Employee header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={reg.userAvatar}
                    alt={reg.userName}
                    className="w-9 h-9 rounded-full object-cover border border-[#E8DFD0]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#0F1E44]">{reg.userName}</p>
                    <p className="text-[10px] text-[#7A829A]">
                      Gửi lúc {reg.submittedAt ? new Date(reg.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    reg.status === 'approved'
                      ? 'bg-[#4CAF72]/15 text-[#4CAF72]'
                      : reg.status === 'rejected'
                      ? 'bg-[#FF3131]/15 text-[#FF3131]'
                      : 'bg-[#EFC14B]/15 text-[#0F1E44]'
                  }`}>
                    {reg.status === 'approved'
                      ? 'Đã xác nhận'
                      : reg.status === 'rejected'
                      ? 'Từ chối'
                      : 'Đang chờ'}
                  </span>
                </div>
              </div>

              {/* Shift summary — 3 trạng thái màu rõ ràng: ca (navy),
                  XIN NGHỈ tường minh (vàng + icon), không đăng ký (xám) */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {reg.days.map((day, idx) => {
                  const si = getShiftInfo(day.shift);
                  const isLeave = day.shift === 'off' && day.type === 'leave';
                  return (
                    <div key={day.date} className="text-center">
                      <p className="text-[8px] text-[#7A829A] uppercase">{DAY_LABELS[idx].replace('Thứ ', 'T')}</p>
                      <p className="text-[9px] text-[#7A829A]">{day.date.split('-')[2]}</p>
                      <div className={`mt-0.5 rounded-md px-1 py-0.5 text-[8px] font-bold ${
                        isLeave
                          ? 'bg-[#EFC14B]/25 text-[#D4A833]'
                          : day.shift === 'off'
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-[#0F1E44]/10 text-[#0F1E44]'
                      }`}>
                        <span className="material-symbols-outlined text-[10px] align-middle">
                          {isLeave ? 'beach_access' : si.icon}
                        </span>
                      </div>
                      {isLeave && (
                        <p className="text-[7px] font-bold text-[#D4A833] mt-0.5">Nghỉ</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manager note if exists */}
              {reg.managerNote && (
                <p className="text-[10px] text-[#7A829A] bg-[#FDF8EE] rounded-lg px-3 py-1.5 mb-3">
                  📝 {reg.managerNote}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleManagerEdit(reg)}
                  className="flex-1 h-9 border border-[#E8DFD0] text-[#0F1E44] rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#FDF8EE]"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Chỉnh sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* EDIT MODAL (Manager)                                 */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Modal header */}
            <div className="p-5 border-b border-[#F5EDDF]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Chỉnh sửa lịch</h3>
                <button onClick={() => setSelectedReg(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <img src={selectedReg.userAvatar} alt={selectedReg.userName} className="w-7 h-7 rounded-full object-cover" />
                <span className="text-sm font-semibold text-[#0F1E44]">{selectedReg.userName}</span>
                <span className="text-xs text-[#7A829A]">— Tuần {selectedReg.weekNumber}</span>
              </div>
            </div>

            {/* Day editing — bảng lưới giống form nhân viên */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Header row */}
              <div className="grid grid-cols-[52px_repeat(4,1fr)] gap-1.5 mb-2">
                <span className="text-[10px] font-bold text-[#7A829A] uppercase flex items-center">Thứ / Ngày</span>
                <span className="text-[10px] font-bold uppercase text-center flex items-center justify-center text-[#7A829A]">Sáng</span>
                <span className="text-[10px] font-bold uppercase text-center flex items-center justify-center text-[#7A829A]">Chiều</span>
                <span className="text-[10px] font-bold uppercase text-center flex items-center justify-center text-[#7A829A]">Tối</span>
                <span className="text-[10px] font-bold uppercase text-center flex items-center justify-center text-[#FF3131]">Nghỉ Off</span>
              </div>

              <div className="space-y-1.5">
                {editDaySelections.map((day, idx) => {
                  const d = new Date(`${day.date}T00:00:00`);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={day.date} className="grid grid-cols-[52px_repeat(4,1fr)] gap-1.5 rounded-xl px-1 py-1.5">
                      {/* Ngày */}
                      <div className="flex flex-col justify-center px-1">
                        <span className={`text-xs font-bold leading-tight ${
                          isWeekend ? 'text-[#FF3131]' : 'text-[#0F1E44]'
                        }`}>
                          {DAY_SHORT[idx]}
                        </span>
                        <span className="text-[10px] text-[#7A829A] leading-tight">
                          {day.date.split('-')[2]}/{day.date.split('-')[1]}
                        </span>
                      </div>

                      {/* 3 nút ca */}
                      {SHIFT_BUTTONS.filter((b) => b.value !== 'off').map((b) => {
                        const active = day.shift === b.value;
                        return (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => handleManagerDayChange(day.date, b.value)}
                            aria-pressed={active}
                            className={`py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                              active
                                ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-sm'
                                : 'bg-white text-[#7A829A] border-[#E8DFD0] hover:border-[#1D4ED8]/50'
                            }`}
                          >
                            {b.label}
                          </button>
                        );
                      })}

                      {/* Off */}
                      <button
                        type="button"
                        onClick={() => handleManagerDayChange(day.date, 'off')}
                        aria-pressed={day.shift === 'off'}
                        className={`py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                          day.shift === 'off'
                            ? 'bg-[#FF3131] text-white border-[#FF3131] shadow-sm'
                            : 'bg-white text-[#FF3131]/80 border-[#FF3131]/30 hover:bg-[#FF3131]/5'
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-[#F5EDDF] flex gap-2">
              <button
                onClick={() => setSelectedReg(null)}
                className="flex-1 h-10 border border-[#E8DFD0] text-[#7A829A] rounded-xl text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleManagerSave}
                className="flex-1 h-10 bg-[#0F1E44] text-white rounded-xl text-xs font-bold hover:bg-[#1A2D5A]"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
