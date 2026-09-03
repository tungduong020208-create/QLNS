import React, { useState, useMemo } from 'react';

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

// Generate mock work schedule data for a given week
const generateWeekSchedule = (employeeId: string, weekMonday: Date): WorkSession[] => {
  const sessions: WorkSession[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const weekDays = getWeekDays(weekMonday);

  weekDays.forEach((date) => {
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const isToday = dateStr === todayStr;
    const isPast = date < today;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekend: no shifts
    if (isWeekend) return;

    // Morning shift (Mon-Fri)
    sessions.push({
      id: `session-morning-${dateStr}`,
      date: dateStr,
      shiftName: 'Ca sáng',
      startTime: '07:00',
      endTime: '12:00',
      checkIn: isPast || isToday ? '07:02' : undefined,
      checkOut: isPast ? '12:05' : isToday && today.getHours() >= 12 ? '12:00' : undefined,
      status: isPast ? 'completed' : isToday ? 'in-progress' : 'upcoming',
      location: 'Cửa hàng Coffee House',
      totalHours: isPast || (isToday && today.getHours() >= 12) ? 5 : undefined,
    });

    // Afternoon shift (Mon-Fri)
    sessions.push({
      id: `session-afternoon-${dateStr}`,
      date: dateStr,
      shiftName: 'Ca chiều',
      startTime: '13:00',
      endTime: '18:00',
      checkIn: isPast ? '13:05' : undefined,
      checkOut: isPast ? '17:55' : undefined,
      status: isPast ? 'completed' : isToday && today.getHours() >= 13 ? 'in-progress' : isToday ? 'upcoming' : 'upcoming',
      location: 'Cửa hàng Coffee House',
      totalHours: isPast ? 5 : undefined,
    });
  });

  return sessions;
};

const WorkSchedule: React.FC<WorkScheduleProps> = ({ employeeId, employeeName }) => {
  // Current week offset (0 = this week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState(0);

  // The Monday of the currently displayed week
  const currentMonday = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  // All 7 days of the displayed week
  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // Generate sessions for this week
  const allSessions = useMemo(
    () => generateWeekSchedule(employeeId, currentMonday),
    [employeeId, currentMonday]
  );

  const todayStr = toDateStr(new Date());

  // Get sessions for a specific date
  const getSessionsForDate = (dateStr: string): WorkSession[] => {
    return allSessions.filter((s) => s.date === dateStr);
  };

  // Weekly stats
  const weekStats = useMemo(() => {
    const workDays = weekDays.filter((d) => {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6; // Mon-Fri only
    });

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
    <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy overflow-hidden mb-6">
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
          onClick={() => setWeekOffset((w) => w - 1)}
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
          onClick={() => setWeekOffset((w) => w + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FDF8EE] transition-colors"
        >
          <span className="material-symbols-outlined text-[#0F1E44] text-xl">chevron_right</span>
        </button>
      </div>

      {/* Weekly Stats Summary */}
      <div className="px-5 py-3 bg-[#EFC14B]/10 border-b border-[#EFC14B]/20">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-[#0F1E44]">{weekStats.completedShifts}/{weekStats.totalShifts}</p>
            <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Ca đã hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-[#0F1E44]">{weekStats.totalHours}h</p>
            <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Giờ làm tuần này</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-[#0F1E44]">
              {weekStats.totalShifts > 0 ? Math.round((weekStats.completedShifts / weekStats.totalShifts) * 100) : 0}%
            </p>
            <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tỷ lệ hoàn thành</p>
          </div>
        </div>
      </div>

      {/* 7-Day Week Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, idx) => {
            const dateStr = toDateStr(date);
            const dayNum = date.getDate();
            const dayName = dayNames[idx];
            const isTodayDate = dateStr === todayStr;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sessions = getSessionsForDate(dateStr);
            const hasSessions = sessions.length > 0;

            return (
              <div
                key={dateStr}
                className={`flex flex-col items-center rounded-xl py-2 transition-all ${
                  isTodayDate
                    ? 'bg-[#EFC14B] text-[#0F1E44] shadow-golden font-bold'
                    : isWeekend
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
                {/* Status indicator */}
                <div className="mt-1.5">
                  {isWeekend ? (
                    <span className="text-[9px] font-semibold text-[#7A829A] bg-[#E8DFD0] px-1.5 py-0.5 rounded-full">
                      Nghỉ
                    </span>
                  ) : hasSessions ? (
                    <div className="flex gap-0.5">
                      {sessions.map((s, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.status === 'completed' ? 'bg-green-500' :
                            s.status === 'in-progress' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] font-semibold text-[#7A829A] bg-[#E8DFD0] px-1.5 py-0.5 rounded-full">
                      Nghỉ
                    </span>
                  )}
                </div>
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
          const isTodayWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

          if (isTodayWeekend || todaySessions.length === 0) {
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

      {/* Footer Legend */}
      <div className="px-5 py-3 bg-[#FDF8EE] border-t border-[#E8DFD0]">
        <div className="flex items-center justify-between text-xs text-[#7A829A]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Hoàn thành</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Đang làm</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              <span>Sắp tới</span>
            </div>
          </div>
          <span className="font-medium">
            {isCurrentWeek ? 'Tuần hiện tại' : weekLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkSchedule;
