import React, { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Shift } from './screens/ManagerScheduleScreen';

export interface WorkSession {
  id: string;
  date: string; // YYYY-MM-DD
  shiftName: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  checkIn?: string;   // HH:MM (if checked in)
  checkOut?: string;  // HH:MM (if checked out)
  status: 'completed' | 'in-progress' | 'upcoming' | 'absent' | 'late';
  location?: string;
  totalHours?: number;
}

interface WorkScheduleProps {
  employeeId: string;
  employeeName: string;
  /** Published shift rows — passed from App via React state so the
   *  component re-renders whenever the store changes (submit, publish,
   *  batch auto-schedule, etc.) instead of reading stale localStorage. */
  shifts: Shift[];
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

// UNIFIED DATA: build sessions from the REAL published shifts passed via
// React state (shifts prop). No more direct localStorage reads — the
// parent component (HomeScreen → App) owns the source of truth and
// re-renders this component whenever the store changes.
const buildWeekSchedule = (employeeId: string, weekMonday: Date, allShifts: Shift[]): WorkSession[] => {
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

      return {
        id: s.id,
        date: s.date,
        shiftName: s.shiftName,
        startTime: s.startTime,
        endTime: s.endTime,
        status,
        location: 'Cửa hàng Coffee House',
        totalHours: totalHours > 0 ? totalHours : undefined,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

const WorkSchedule: React.FC<WorkScheduleProps> = ({ employeeId, employeeName, shifts }) => {
  // Current week offset (0 = this week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState(0);
  // Selected day for the detail popover
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Animation direction for week transitions
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  // Flip popover upward when it would overflow the viewport bottom
  const [flipUp, setFlipUp] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // --- Swipe gesture for week navigation ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
        // Swipe left → next week
        setSlideDir('left');
        setWeekOffset((w) => w + 1);
      } else {
        // Swipe right → previous week
        setSlideDir('right');
        setWeekOffset((w) => w - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  // Reset slide animation after it plays
  const handleAnimEnd = useCallback(() => setSlideDir(null), []);

  // Measure popover after render; flip upward if it would overflow viewport
  useLayoutEffect(() => {
    if (selectedDay && popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      // 80 px margin accounts for BottomNav + safe-area
      setFlipUp(rect.bottom > window.innerHeight - 80);
    } else {
      setFlipUp(false);
    }
  }, [selectedDay]);

  // The Monday of the currently displayed week
  const currentMonday = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  // All 7 days of the displayed week
  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // Build sessions for this week from the shifts prop (React state)
  const allSessions = useMemo(
    () => buildWeekSchedule(employeeId, currentMonday, shifts),
    [employeeId, currentMonday, shifts]
  );

  const todayStr = toDateStr(new Date());

  // Get sessions for a specific date
  const getSessionsForDate = (dateStr: string): WorkSession[] => {
    return allSessions.filter((s) => s.date === dateStr);
  };

  // Weekly stats
  const weekStats = useMemo(() => {
    // Work days = days that actually HAVE a scheduled shift (Sat/Sun count
    // exactly like weekdays — no more hard-coded Mon–Fri exclusion).
    const workDays = weekDays.filter((d) => getSessionsForDate(toDateStr(d)).length > 0);

    const totalWorkDays = workDays.length;
    const completedDays = workDays.filter((d) => {
      const ds = toDateStr(d);
      const sessions = getSessionsForDate(ds);
      return sessions.length > 0 && sessions.every((s) => s.status === 'completed');
    }).length;

    const totalHours = allSessions.reduce((acc, s) => acc + (s.totalHours || 0), 0);
    const totalShifts = allSessions.length;
    const completedShifts = allSessions.filter((s) => s.status === 'completed').length;

    return { totalWorkDays, completedDays, totalHours, totalShifts, completedShifts };
  }, [weekDays, allSessions]);

  // Format week range label
  const weekLabel = useMemo(() => {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
    return `${currentMonday.toLocaleDateString('vi-VN', opts)} – ${sunday.toLocaleDateString('vi-VN', opts)}`;
  }, [currentMonday]);

  // Vietnamese day names
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const getStatusColor = (status: WorkSession['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'upcoming': return 'text-gray-500 bg-gray-100';
      case 'absent': return 'text-red-500 bg-red-50';
      case 'late': return 'text-orange-500 bg-orange-50';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusText = (status: WorkSession['status']) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in-progress': return 'Đang làm';
      case 'upcoming': return 'Sắp tới';
      case 'absent': return 'Vắng mặt';
      case 'late': return 'Đi trễ';
      default: return '';
    }
  };

  const getStatusIcon = (status: WorkSession['status']) => {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'in-progress': return 'pending';
      case 'upcoming': return 'schedule';
      case 'absent': return 'cancel';
      case 'late': return 'warning';
      default: return 'help';
    }
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy mb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F5EDDF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EFC14B]/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0F1E44] text-xl">calendar_month</span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Buổi làm việc</h3>
              <p className="text-xs text-[#7A829A]">Lịch trình làm việc của bạn</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="px-5 py-3 border-b border-[#F5EDDF] flex items-center justify-between">
        <button
          onClick={() => { setSlideDir('right'); setWeekOffset((w) => w - 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FDF8EE] transition-colors"
        >
          <span className="material-symbols-outlined text-[#0F1E44] text-xl">chevron_left</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="font-heading font-bold text-sm text-[#0F1E44]">
            Tuần {weekLabel}
          </span>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[10px] font-semibold text-[#EFC14B] hover:underline mt-0.5"
            >
              Về tuần hiện tại
            </button>
          )}
        </div>

        <button
          onClick={() => { setSlideDir('left'); setWeekOffset((w) => w + 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FDF8EE] transition-colors"
        >
          <span className="material-symbols-outlined text-[#0F1E44] text-xl">chevron_right</span>
        </button>
      </div>

      {/* Weekly Stats Summary */}
      <div className="px-5 py-3 bg-[#EFC14B]/10 border-b border-[#EFC14B]/20">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-xl font-heading font-bold text-[#0F1E44]">{weekStats.completedShifts}/{weekStats.totalShifts}</p>
            <p className="text-[9px] text-[#7A829A] uppercase tracking-wider font-semibold">Ca hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-heading font-bold text-[#0F1E44]">{weekStats.totalHours}h</p>
            <p className="text-[9px] text-[#7A829A] uppercase tracking-wider font-semibold">Giờ tuần này</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-heading font-bold text-[#0F1E44]">
              {weekStats.totalWorkDays > 0 ? (weekStats.totalHours / weekStats.totalWorkDays).toFixed(1) : '0'}h
            </p>
            <p className="text-[9px] text-[#7A829A] uppercase tracking-wider font-semibold">TB giờ/ngày</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-heading font-bold text-[#0F1E44]">
              {weekStats.totalShifts > 0 ? Math.round((weekStats.completedShifts / weekStats.totalShifts) * 100) : 0}%
            </p>
            <p className="text-[9px] text-[#7A829A] uppercase tracking-wider font-semibold">Hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Mini Legend — above the calendar grid */}
      <div className="px-5 pt-3 pb-1 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-semibold text-[#7A829A] uppercase tracking-wider">Chú giải:</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] text-[#7A829A]">Hoàn thành</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[10px] text-[#7A829A]">Đang làm</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-300 rounded-full" />
            <span className="text-[10px] text-[#7A829A]">Sắp tới</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-[#7A829A] bg-[#E8DFD0] px-1.5 py-0.5 rounded-full leading-none">Nghỉ</span>
            <span className="text-[10px] text-[#7A829A]">Không có ca</span>
          </div>
        </div>
      </div>

      {/* 7-Day Week Grid — swipeable */}
      <div
        ref={gridRef}
        className={`px-4 py-3 ${slideDir === 'left' ? 'animate-slide-left' : slideDir === 'right' ? 'animate-slide-right' : ''}`}
        onAnimationEnd={handleAnimEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((date, idx) => {
            const dateStr = toDateStr(date);
            const dayNum = date.getDate();
            const dayName = dayNames[idx];
            const isTodayDate = dateStr === todayStr;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sessions = getSessionsForDate(dateStr);
            const hasSessions = sessions.length > 0;
            const isSelected = selectedDay === dateStr;

            return (
              <div key={dateStr} className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`w-full flex flex-col items-center rounded-xl py-2 transition-all ${
                    isSelected
                      ? 'ring-2 ring-[#EFC14B] ring-offset-1 '
                      : ''
                  } ${
                    isTodayDate
                      ? 'bg-[#EFC14B] text-[#0F1E44] shadow-golden font-bold'
                      : isWeekend && !hasSessions
                      ? 'bg-[#F5EDDF] text-[#7A829A]'
                      : 'bg-[#FDF8EE] text-[#3D4663] hover:bg-[#EFC14B]/10'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${
                    isTodayDate ? 'text-[#0F1E44]/70' : 'text-[#7A829A]'
                  }`}>
                    {dayName}
                  </span>
                  <span className={`text-lg font-bold mt-0.5 ${
                    isTodayDate ? 'text-[#0F1E44]' : ''
                  }`}>
                    {dayNum}
                  </span>
                  {isTodayDate && (
                    <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                      Hôm nay
                    </span>
                  )}
                  {/* Shift count badge — replaces cryptic dots */}
                  <div className="mt-1.5">
                    {!hasSessions ? (
                      <span className="text-[9px] font-semibold text-[#7A829A] bg-[#E8DFD0] px-1.5 py-0.5 rounded-full">
                        Nghỉ
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-[#3D4663] bg-white/70 px-1.5 py-0.5 rounded-full shadow-sm">
                        {sessions.length} ca
                      </span>
                    )}
                  </div>
                </button>

                {/* Day detail popover */}
                {isSelected && hasSessions && (
                  <div
                    ref={popoverRef}
                    className={`absolute min-w-[150px] max-w-[180px] bg-white rounded-lg border border-[#E8DFD0] shadow-md p-2 text-left z-20 animate-popover-in ${
                      // Horizontal: first column → left-0, last → right-0, else centered
                      idx === 0 ? 'left-0' :
                      idx === 6 ? 'right-0' :
                      'left-1/2 -translate-x-1/2'
                    } ${
                      // Vertical: flip above when near viewport bottom
                      flipUp ? 'bottom-full mb-1' : 'top-[calc(100%+2px)]'
                    }`}
                  >
                    <p className="text-[9px] font-bold text-[#0F1E44] mb-1.5">
                      {dayName} {dayNum} — {sessions.length} ca
                    </p>
                    <div className="space-y-1">
                      {sessions.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[9px]">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            s.status === 'completed' ? 'bg-green-500' :
                            s.status === 'in-progress' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-[#3D4663] truncate">
                            {s.shiftName} {s.startTime}–{s.endTime}
                          </span>
                          <span className={`ml-auto flex-shrink-0 text-[8px] font-semibold ${
                            s.status === 'completed' ? 'text-green-600' :
                            s.status === 'in-progress' ? 'text-blue-600' :
                            'text-gray-400'
                          }`}>
                            {s.status === 'completed' ? '✓' : s.status === 'in-progress' ? '●' : '○'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sessions Detail for Selected Day (today or the day with activity) */}
      <div className="px-5 py-4 border-t border-[#F5EDDF]">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-bold text-[#0F1E44]">
            Chi tiết hôm nay
          </h4>
          <span className="text-xs text-[#7A829A]">
            ({weekDays.find((d) => toDateStr(d) === todayStr)?.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })})
          </span>
        </div>

        {(() => {
          const todaySessions = getSessionsForDate(todayStr);
          // Data-driven: today is a day off ONLY if no shift is scheduled,
          // regardless of whether it's Saturday/Sunday.
          if (todaySessions.length === 0) {
            return (
              <div className="text-center py-6 bg-[#FDF8EE] rounded-xl">
                <span className="material-symbols-outlined text-4xl text-[#E8DFD0] mb-2 block">
                  event_busy
                </span>
                <p className="text-sm text-[#7A829A] font-medium">Hôm nay bạn nghỉ</p>
                <p className="text-xs text-[#7A829A]/70 mt-1">Không có ca làm việc</p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-xl p-4 border ${
                    session.status === 'in-progress'
                      ? 'bg-[#EFC14B]/10 border-[#EFC14B]/30 shadow-sm'
                      : 'bg-[#FDF8EE] border-[#E8DFD0]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-lg ${
                          session.status === 'completed' ? 'text-green-600' :
                          session.status === 'in-progress' ? 'text-[#EFC14B]' :
                          'text-[#7A829A]'
                        }`}>
                          {getStatusIcon(session.status)}
                        </span>
                        <h5 className="font-bold text-[#0F1E44] text-sm">{session.shiftName}</h5>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[#7A829A] text-base">schedule</span>
                          <span className="text-[#3D4663]">
                            {session.startTime} – {session.endTime}
                          </span>
                        </div>
                        {session.totalHours && (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[#7A829A] text-base">timer</span>
                            <span className="text-[#3D4663] font-medium">{session.totalHours}h</span>
                          </div>
                        )}
                      </div>

                      {session.checkIn && (
                        <div className="mt-2 flex items-center gap-4 text-xs">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Footer — compact week label only */}
      <div className="px-5 py-2 bg-[#FDF8EE] border-t border-[#E8DFD0]">
        <div className="flex items-center justify-end">
          <span className="text-[10px] font-medium text-[#7A829A]">
            {isCurrentWeek ? 'Tuần hiện tại' : weekLabel} — Chạm vào ngày để xem chi tiết
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkSchedule;
