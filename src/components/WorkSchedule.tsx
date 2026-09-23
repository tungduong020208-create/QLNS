import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Shift } from './screens/ManagerScheduleScreen';
import { ShiftCapacityOverride } from '../types';
import { getCapacityForDate } from '../hooks/useShiftCapacity';

export interface WorkSession {
  id: string;
  date: string; // YYYY-MM-DD
  shiftName: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  checkIn?: string;   // HH:MM (if checked in)
  checkOut?: string;  // HH:MM (if checked out)
  status: 'completed' | 'in-progress' | 'upcoming' | 'absent' | 'late';
  totalHours?: number;
  /** Số người tối đa của ca (ngày) — dùng tính tỷ lệ "3/3 Đủ người". */
  maxCapacity: number;
}

interface WorkScheduleProps {
  employeeId: string;
  employeeName: string;
  /** Published shift rows — passed from App via React state so the
   *  component re-renders whenever the store changes (submit, publish,
   *  batch auto-schedule, etc.) instead of reading stale localStorage. */
  shifts: Shift[];
  /** Capacity per (date, shift) — manager-adjustable. */
  capacityOverrides: ShiftCapacityOverride[];
}

// Helper: get Monday of the week containing a date
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: format date to YYYY-MM-DD using LOCAL time (not UTC)
const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: get 7 days of a week starting from Monday
const getWeekDays = (monday: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

// ISO week number (Tuần 39, 40, ...) tính theo chuẩn ISO-8601.
const getIsoWeek = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

// "Thứ Hai, 21/09" — header từng nhóm ngày trong danh sách chi tiết.
const formatDayHeader = (date: Date): string => {
  const fullNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${fullNames[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// "21/09 - 27/09/2026" — nhãn khoảng tuần (Thứ 2 → Chủ Nhật).
const formatShiftDateRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date, withYear = false) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}${withYear ? `/${d.getFullYear()}` : ''}`;
  return `${fmt(monday)} - ${fmt(sunday, true)}`;
};

// "24h" / "24.5h" — bỏ số thập phân tròn.
const formatHours = (hours: number): string => `${Number(hours.toFixed(1))}h`;

// UNIFIED DATA: build sessions from the REAL published shifts passed via
// React state (shifts prop). No more direct localStorage reads — the
// parent component (HomeScreen → App) owns the source of truth and
// re-renders this component whenever the store changes.
const buildWeekSchedule = (
  employeeId: string,
  weekMonday: Date,
  allShifts: Shift[],
  capacityOverrides: ShiftCapacityOverride[]
): WorkSession[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const weekDays = getWeekDays(weekMonday);
  const first = toDateStr(weekDays[0]);
  const last = toDateStr(weekDays[6]);

  const weekShifts = allShifts.filter(
    (s) => s.employeeId === employeeId && s.date >= first && s.date <= last
  );

  return weekShifts
    .map((s): WorkSession => {
      const isPastDate = s.date < todayStr;
      const isToday = s.date === todayStr;

      // Parse HH:MM to compute duration — weekend and weekday shifts are
      // treated identically (no special-casing).
      const toMin = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const totalHours = (toMin(s.endTime) - toMin(s.startTime)) / 60;

      // Status: completed/in-progress derive from date + current time,
      // otherwise the manager's status flows through as-is.
      let status: WorkSession['status'] = 'upcoming';
      if (s.status === 'cancelled') status = 'absent';
      else if (s.status === 'completed') status = 'completed';
      else if (isPastDate) status = 'completed';
      else if (isToday) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (nowMin >= toMin(s.startTime)) status = 'in-progress';
      }

      // Capacity của ca theo ngày (mặc định + override của quản lý).
      // getCapacityForDate nhận TÊN ca ('Ca sáng') và tự map sang slot.

      return {
        id: s.id,
        date: s.date,
        shiftName: s.shiftName,
        startTime: s.startTime,
        endTime: s.endTime,
        status,
        totalHours: totalHours > 0 ? totalHours : undefined,
        maxCapacity: getCapacityForDate(capacityOverrides, s.date, s.shiftName),
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

// Avatar member của ca: dùng ảnh nếu có, fallback chữ cái đầu.
const ShiftAvatar: React.FC<{ row: Shift }> = ({ row }) => {
  const url = row.employeeAvatar;
  if (url && /^(https?:|data:)/.test(url)) {
    return (
      <img
        src={url}
        alt={row.employeeName}
        className="w-6 h-6 rounded-full border-2 border-white object-cover bg-[#E8DFD0]"
      />
    );
  }
  const initials = (row.employeeName || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-6 h-6 rounded-full border-2 border-white bg-[#EFC14B]/40 flex items-center justify-center text-[9px] font-bold text-[#0F1E44]">
      {initials}
    </div>
  );
};

const WorkSchedule: React.FC<WorkScheduleProps> = ({ employeeId, employeeName, shifts, capacityOverrides }) => {
  // Current week offset (0 = this week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState(0);
  // Animation direction for week transitions
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  // Bộ lọc ngày cho danh sách chi tiết — "Hôm nay" LUÔN là mặc định mỗi lần vào trang
  const [dayFilter, setDayFilter] = useState<'today' | 'week'>('today');

  // --- Swipe gesture for week navigation ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe > 50px and more horizontal than vertical
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        setSlideDir('left');
        setWeekOffset((w) => w + 1);
      } else {
        setSlideDir('right');
        setWeekOffset((w) => w - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  // Reset slide animation after it plays
  const handleAnimEnd = useCallback(() => setSlideDir(null), []);

  const goPrevWeek = useCallback(() => { setSlideDir('right'); setWeekOffset((w) => w - 1); }, []);
  const goNextWeek = useCallback(() => { setSlideDir('left'); setWeekOffset((w) => w + 1); }, []);

  // The Monday of the currently displayed week
  const currentMonday = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  // All 7 days of the displayed week
  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // Build sessions for this week from the shifts prop (React state)
  const allSessions = useMemo(
    () => buildWeekSchedule(employeeId, currentMonday, shifts, capacityOverrides),
    [employeeId, currentMonday, shifts, capacityOverrides]
  );

  const todayStr = toDateStr(new Date());
  const isCurrentWeek = weekOffset === 0;

  const getSessionsForDate = (dateStr: string): WorkSession[] =>
    allSessions.filter((s) => s.date === dateStr);

  // Hôm nay có thuộc tuần đang xem không (bộ lọc 'Hôm nay' cần biết)
  const todayInDisplayedWeek = weekDays.some((d) => toDateStr(d) === todayStr);

  // Ngày render trong danh sách chi tiết: chỉ hôm nay (mặc định) hoặc cả tuần.
  // Khi chọn 'Hôm nay' nhưng đang xem tuần khác → fallback cả tuần + dòng nhắc.
  const detailDays = useMemo(
    () =>
      dayFilter === 'today' && todayInDisplayedWeek
        ? weekDays.filter((d) => toDateStr(d) === todayStr)
        : weekDays,
    [dayFilter, todayInDisplayedWeek, weekDays, todayStr]
  );

  // --- Weekly stats (3 thẻ: Tổng số ca / Tổng giờ làm / Ngày nghỉ) ---
  const weekStats = useMemo(() => {
    const totalShifts = allSessions.filter((s) => s.status !== 'absent').length;
    const totalHours = allSessions
      .filter((s) => s.status !== 'absent')
      .reduce((acc, s) => acc + (s.totalHours || 0), 0);
    const daysWithShifts = weekDays.filter((d) => getSessionsForDate(toDateStr(d)).some((s) => s.status !== 'absent')).length;
    const dayOffs = 7 - daysWithShifts;
    return { totalShifts, totalHours, dayOffs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, allSessions]);

  // Vietnamese short day names for the week strip
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const getStatusPill = (status: WorkSession['status']) => {
    switch (status) {
      case 'completed': return { text: 'Đã chốt', cls: 'bg-green-100 text-green-700' };
      case 'in-progress': return { text: 'Đang làm', cls: 'bg-blue-100 text-blue-700' };
      case 'upcoming': return { text: 'Sắp diễn ra', cls: 'bg-gray-100 text-gray-500' };
      case 'absent': return { text: 'Đã hủy', cls: 'bg-red-50 text-red-500' };
      case 'late': return { text: 'Đi trễ', cls: 'bg-orange-50 text-orange-500' };
      default: return { text: '', cls: 'bg-gray-100 text-gray-500' };
    }
  };

  // Tỷ lệ nhân sự của một ca: các dòng cùng (ngày, ca) chưa bị hủy.
  const getShiftRoster = (dateStr: string, shiftName: string): Shift[] => {
    const rows = shifts.filter(
      (r) => r.date === dateStr && r.shiftName === shiftName && r.status !== 'cancelled'
    );
    const unique = Array.from(new Map(rows.map((r) => [r.employeeId, r])).values());
    // Bản thân đứng đầu danh sách avatar
    return [
      ...unique.filter((r) => r.employeeId === employeeId),
      ...unique.filter((r) => r.employeeId !== employeeId),
    ];
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy mb-6">
      {/* Header — Tuần {n} (khoảng ngày) + điều hướng tuần */}
      <div className="px-5 py-4 border-b border-[#F5EDDF] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#EFC14B]/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[#0F1E44] text-xl">calendar_month</span>
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-[#0F1E44]">
              Tuần {getIsoWeek(currentMonday)}{' '}
              <span className="text-sm font-medium text-[#7A829A]">({formatShiftDateRange(currentMonday)})</span>
            </h3>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[10px] font-semibold text-[#EFC14B] hover:underline"
              >
                Về tuần hiện tại
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevWeek}
            aria-label="Tuần trước"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5EDDF] hover:bg-[#EFC14B]/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[#0F1E44] text-lg">chevron_left</span>
          </button>
          <button
            onClick={goNextWeek}
            aria-label="Tuần sau"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5EDDF] hover:bg-[#EFC14B]/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[#0F1E44] text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Week strip — 7 ngày, chấm vàng = có ca, chấm xám = nghỉ */}
      <div
        className={`px-4 py-3 ${slideDir === 'left' ? 'animate-slide-left' : slideDir === 'right' ? 'animate-slide-right' : ''}`}
        onAnimationEnd={handleAnimEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((date, idx) => {
            const dateStr = toDateStr(date);
            const isTodayDate = dateStr === todayStr && isCurrentWeek;
            const hasShift = getSessionsForDate(dateStr).some((s) => s.status !== 'absent');
            return (
              <div
                key={dateStr}
                className={`flex flex-col items-center rounded-xl py-2 ${
                  isTodayDate
                    ? 'bg-[#0F1E44] text-white shadow-navy'
                    : hasShift
                    ? 'bg-[#FDF8EE] text-[#3D4663]'
                    : 'bg-[#FAFAF8] text-[#7A829A]'
                }`}
              >
                <span className={`text-[10px] font-semibold ${isTodayDate ? 'text-white/70' : 'text-[#7A829A]'}`}>
                  {dayNames[idx]}
                </span>
                <span className={`text-base font-bold mt-0.5 ${isTodayDate ? 'text-white' : ''}`}>
                  {date.getDate()}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${hasShift ? 'bg-[#EFC14B]' : 'bg-[#D9D9D9]'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Stats — 3 thẻ */}
      <div className="px-5 py-3 grid grid-cols-3 gap-3">
        <div className="bg-[#F8F6F1] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#0F1E44] text-base">work</span>
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-[#0F1E44] leading-tight">{weekStats.totalShifts}</p>
            <p className="text-[9px] text-[#7A829A] font-medium leading-tight">Tổng số ca</p>
          </div>
        </div>
        <div className="bg-[#F8F6F1] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#0F1E44] text-base">schedule</span>
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-[#0F1E44] leading-tight">{formatHours(weekStats.totalHours)}</p>
            <p className="text-[9px] text-[#7A829A] font-medium leading-tight">Tổng giờ làm</p>
          </div>
        </div>
        <div className="bg-[#F8F6F1] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#0F1E44] text-base">event_busy</span>
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-[#0F1E44] leading-tight">{weekStats.dayOffs}</p>
            <p className="text-[9px] text-[#7A829A] font-medium leading-tight">Ngày nghỉ</p>
          </div>
        </div>
      </div>

      {/* Danh sách chi tiết theo ngày */}
      <div className="px-5 pb-5 pt-1 border-t border-[#F5EDDF]">
        <div className="flex items-center justify-between py-3">
          <h4 className="text-sm font-bold text-[#0F1E44]">Lịch chi tiết theo ngày</h4>
          {/* Bộ lọc ngày — "Hôm nay" luôn mặc định */}
          <div className="flex items-center bg-[#F5EDDF] rounded-full p-0.5">
            <button
              onClick={() => setDayFilter('today')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                dayFilter === 'today'
                  ? 'bg-[#EFC14B] text-[#0F1E44] shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setDayFilter('week')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                dayFilter === 'week'
                  ? 'bg-[#EFC14B] text-[#0F1E44] shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              Cả tuần
            </button>
          </div>
        </div>

        {/* 'Hôm nay' mà hôm nay không thuộc tuần đang xem → nhắc + nút quay về */}
        {dayFilter === 'today' && !todayInDisplayedWeek && (
          <div className="flex items-center justify-between gap-3 mb-3 py-2.5 px-3.5 rounded-xl bg-[#FDF8EE] border border-[#EFC14B]/30">
            <p className="text-xs text-[#7A829A]">
              Hôm nay ({formatDayHeader(new Date())}) không thuộc tuần này
            </p>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[11px] font-bold text-[#0F1E44] bg-[#EFC14B] px-3 py-1.5 rounded-full hover:bg-[#EFC14B]/80 transition-colors flex-shrink-0"
            >
              Về hôm nay
            </button>
          </div>
        )}

        <div className="space-y-4">
          {detailDays.map((date) => {
            const dateStr = toDateStr(date);
            const sessions = getSessionsForDate(dateStr).filter((s) => s.status !== 'absent');
            const isTodayDate = dateStr === todayStr && isCurrentWeek;

            return (
              <div key={dateStr}>
                {/* Day group header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F1E44]/70" />
                    <span className={`text-sm font-bold ${isTodayDate ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                      {formatDayHeader(date)}
                    </span>
                  </div>
                  {sessions.length > 0 && (
                    <span className="text-[10px] font-semibold text-[#7A829A] bg-[#F5EDDF] px-2 py-0.5 rounded-full">
                      {sessions.length} ca làm việc
                    </span>
                  )}
                </div>

                {sessions.length === 0 ? (
                  /* Ngày nghỉ — không có ca */
                  <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-[#FAFAF8]">
                    <span className="material-symbols-outlined text-[#7A829A] text-base">calendar_off</span>
                    <p className="text-xs text-[#7A829A]">Nghỉ — Không có ca làm việc</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sessions.map((session) => {
                      const pill = getStatusPill(session.status);
                      const roster = getShiftRoster(dateStr, session.shiftName);
                      const taken = roster.length;
                      const isFull = taken >= session.maxCapacity;
                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl p-3.5 border ${
                            session.status === 'in-progress'
                              ? 'bg-[#EFC14B]/10 border-[#EFC14B]/30 shadow-sm'
                              : 'bg-white border-[#E8DFD0]'
                          }`}
                        >
                          {/* Tên ca + trạng thái + menu */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <h5 className="font-bold text-[#0F1E44] text-sm">{session.shiftName}</h5>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pill.cls}`}>
                              {pill.text}
                            </span>
                            <span className="material-symbols-outlined text-[#7A829A] text-lg ml-auto">more_vert</span>
                          </div>

                          {/* Giờ + số công */}
                          <div className="flex items-center gap-1.5 text-sm mb-2">
                            <span className="material-symbols-outlined text-[#7A829A] text-base">schedule</span>
                            <span className="text-[#3D4663]">
                              {session.startTime} - {session.endTime}
                              {session.totalHours ? ` (${session.totalHours.toFixed(1)} giờ)` : ''}
                            </span>
                          </div>

                          {/* Check-in/out nếu đã có */}
                          {session.checkIn && (
                            <div className="flex items-center gap-4 text-xs mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-[#7A829A]">Vào: <strong className="text-[#0F1E44]">{session.checkIn}</strong></span>
                              </div>
                              {session.checkOut && (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 bg-[#FF3131] rounded-full" />
                                  <span className="text-[#7A829A]">Ra: <strong className="text-[#0F1E44]">{session.checkOut}</strong></span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Nhân sự cùng ca + tỷ lệ đủ người */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex -space-x-2">
                                {roster.slice(0, 4).map((r) => (
                                  <ShiftAvatar key={r.employeeId} row={r} />
                                ))}
                              </div>
                              {roster.length > 4 && (
                                <span className="text-[10px] font-semibold text-[#7A829A] ml-1.5">
                                  +{roster.length - 4}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[11px] font-semibold ${
                                isFull ? 'text-green-600' : 'text-amber-600'
                              }`}
                            >
                              {taken}/{session.maxCapacity} {isFull ? 'Đủ người' : 'Còn trống'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkSchedule;
