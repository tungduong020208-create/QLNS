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

// Generate mock work schedule data
const generateMockSchedule = (employeeId: string): WorkSession[] => {
  const today = new Date();
  const sessions: WorkSession[] = [];

  // Generate schedule for the past 7 days and next 3 days
  for (let i = -6; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const isToday = i === 0;
    const isPast = i < 0;
    const isFuture = i > 0;

    // Morning shift
    sessions.push({
      id: `session-morning-${dateStr}`,
      date: dateStr,
      shiftName: 'Ca sáng',
      startTime: '07:00',
      endTime: '12:00',
      checkIn: isPast || isToday ? '07:02' : undefined,
      checkOut: isPast ? '12:05' : isToday ? '12:00' : undefined,
      status: isPast ? 'completed' : isToday ? 'in-progress' : 'upcoming',
      location: 'Cửa hàng Coffee House',
      totalHours: isPast || (isToday && date.getHours() >= 12) ? 5 : undefined,
    });

    // Afternoon shift
    sessions.push({
      id: `session-afternoon-${dateStr}`,
      date: dateStr,
      shiftName: 'Ca chiều',
      startTime: '13:00',
      endTime: '18:00',
      checkIn: isPast ? '13:05' : undefined,
      checkOut: isPast ? '17:55' : undefined,
      status: isPast ? 'completed' : isToday && date.getHours() >= 13 ? 'in-progress' : isFuture ? 'upcoming' : isToday ? 'upcoming' : 'absent',
      location: 'Cửa hàng Coffee House',
      totalHours: isPast ? 5 : undefined,
    });
  }

  return sessions;
};

const WorkSchedule: React.FC<WorkScheduleProps> = ({ employeeId, employeeName }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');

  const allSessions = useMemo(() => generateMockSchedule(employeeId), [employeeId]);

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Get unique dates - today first, then past, then future
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allSessions.map(s => s.date))] as string[];
    const now = new Date().toISOString().split('T')[0];
    return dates.sort((a, b) => {
      // Today comes first
      if (a === now) return -1;
      if (b === now) return 1;
      // Past dates before future dates, most recent first
      const aIsPast = a < now;
      const bIsPast = b < now;
      if (aIsPast && !bIsPast) return -1;
      if (!aIsPast && bIsPast) return 1;
      return b.localeCompare(a);
    });
  }, [allSessions, todayStr]);

  // Get sessions for selected date
  const selectedSessions = useMemo(() => {
    return allSessions.filter(s => s.date === selectedDate);
  }, [allSessions, selectedDate]);

  // Get today's sessions
  const todaySessions = useMemo(() => {
    return allSessions.filter(s => s.date === todayStr);
  }, [allSessions, todayStr]);

  // Weekly stats
  const weekStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    const weekSessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const completed = weekSessions.filter(s => s.status === 'completed').length;
    const total = weekSessions.filter(s => s.status !== 'upcoming').length;
    const totalHours = weekSessions.reduce((acc, s) => acc + (s.totalHours || 0), 0);

    return { completed, total, totalHours };
  }, [allSessions]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === todayStr) return 'Hôm nay';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Hôm qua';

    return date.toLocaleDateString('vi-VN', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

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
      case 'completed': return 'Đã hoàn thành';
      case 'in-progress': return 'Đang làm';
      case 'upcoming': return 'Sắp tới';
      case 'absent': return 'Vắng mặt';
      case 'late': return 'Đi trễ';
      default: return 'Không xác định';
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600 text-xl">calendar_month</span>
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-[#1b1b21]">Buổi làm việc</h3>
              <p className="text-xs text-gray-500">Lịch trình làm việc của bạn</p>
            </div>
          </div>
          
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'today' 
                  ? 'bg-white text-[#000666] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'week' 
                  ? 'bg-white text-[#000666] shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tuần
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Stats Summary */}
      <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{weekStats.completed}</p>
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider font-semibold">Buổi đã hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{weekStats.totalHours}</p>
            <p className="text-[10px] text-blue-500 uppercase tracking-wider font-semibold">Giờ làm tuần này</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{weekStats.total > 0 ? Math.round((weekStats.completed / weekStats.total) * 100) : 0}%</p>
            <p className="text-[10px] text-green-500 uppercase tracking-wider font-semibold">Tỷ lệ hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Date Selector (Horizontal scroll) */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {uniqueDates.slice(0, 10).map((dateStr) => {
            const date = new Date(dateStr);
            const dayNum = date.getDate();
            const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
            const isSelected = dateStr === selectedDate;
            const isTodayDate = dateStr === todayStr;
            const daySessions = allSessions.filter(s => s.date === dateStr);
            const hasCompleted = daySessions.some(s => s.status === 'completed');
            const hasInProgress = daySessions.some(s => s.status === 'in-progress');

            return (
              <button
                key={dateStr}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setViewMode('today');
                }}
                className={`flex-shrink-0 w-14 py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#000666] text-white shadow-md'
                    : isTodayDate
                    ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${
                  isSelected ? 'text-white/70' : isTodayDate ? 'text-indigo-500' : 'text-gray-400'
                }`}>
                  {dayName}
                </span>
                <span className={`text-lg font-bold ${
                  isSelected ? 'text-white' : isTodayDate ? 'text-indigo-700' : 'text-gray-700'
                }`}>
                  {dayNum}
                </span>
                {/* Status dots */}
                <div className="flex gap-0.5">
                  {daySessions.map((s, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        s.status === 'completed' ? 'bg-green-400' :
                        s.status === 'in-progress' ? 'bg-blue-400' :
                        s.status === 'upcoming' ? 'bg-gray-300' :
                        'bg-red-400'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions List */}
      <div className="px-5 py-4">
        {viewMode === 'today' ? (
          // Selected day's sessions
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-bold text-[#1b1b21]">Ca làm việc {selectedDate === todayStr ? 'hôm nay' : formatDate(selectedDate)}</h4>
              <span className="text-xs text-gray-400">({selectedSessions.length} ca)</span>
            </div>
            
            {selectedSessions.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">event_busy</span>
                <p className="text-sm text-gray-400">Ngày này không có ca làm việc</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl p-4 border ${
                      session.status === 'in-progress' 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`material-symbols-outlined text-lg ${
                            session.status === 'completed' ? 'text-green-600' :
                            session.status === 'in-progress' ? 'text-blue-600' :
                            'text-gray-400'
                          }`}>
                            {getStatusIcon(session.status)}
                          </span>
                          <h5 className="font-bold text-[#1b1b21]">{session.shiftName}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(session.status)}`}>
                            {getStatusText(session.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-gray-400 text-base">schedule</span>
                            <span className="text-gray-600">
                              {session.startTime} - {session.endTime}
                            </span>
                          </div>
                          {session.totalHours && (
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-gray-400 text-base">timer</span>
                              <span className="text-gray-600 font-medium">{session.totalHours}h</span>
                            </div>
                          )}
                        </div>

                        {session.checkIn && (
                          <div className="mt-2 flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-green-400 rounded-full" />
                              <span className="text-gray-500">Vào: <strong className="text-gray-700">{session.checkIn}</strong></span>
                            </div>
                            {session.checkOut && (
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-red-400 rounded-full" />
                                <span className="text-gray-500">Ra: <strong className="text-gray-700">{session.checkOut}</strong></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Weekly view
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-bold text-[#1b1b21]">Lịch tuần này</h4>
              <span className="text-xs text-gray-400">({uniqueDates.length} ngày)</span>
            </div>
            
            <div className="space-y-4">
              {uniqueDates.slice(0, 5).map((dateStr) => {
                const daySessions = allSessions.filter(s => s.date === dateStr);
                const completedCount = daySessions.filter(s => s.status === 'completed').length;
                const totalSessions = daySessions.length;
                const isTodayDate = dateStr === todayStr;
                const isPastDate = new Date(dateStr) < new Date(todayStr);

                return (
                  <div
                    key={dateStr}
                    className={`rounded-xl p-3 border ${
                      isTodayDate ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isTodayDate ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {formatDate(dateStr)}
                        </span>
                        {isTodayDate && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                            HÔM NAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">{completedCount}/{totalSessions} ca</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-400 rounded-full transition-all"
                            style={{ width: `${totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex-1 rounded-lg p-2 text-center ${
                            session.status === 'completed' ? 'bg-green-100' :
                            session.status === 'in-progress' ? 'bg-blue-100' :
                            session.status === 'upcoming' ? 'bg-gray-100' :
                            'bg-red-50'
                          }`}
                        >
                          <p className={`text-[10px] font-bold uppercase ${
                            session.status === 'completed' ? 'text-green-700' :
                            session.status === 'in-progress' ? 'text-blue-700' :
                            session.status === 'upcoming' ? 'text-gray-500' :
                            'text-red-500'
                          }`}>
                            {session.shiftName.split(' ')[1]}
                          </p>
                          <p className={`text-xs font-bold mt-0.5 ${
                            session.status === 'completed' ? 'text-green-600' :
                            session.status === 'in-progress' ? 'text-blue-600' :
                            'text-gray-400'
                          }`}>
                            {session.checkIn || '--:--'}
                          </p>
                          {session.checkOut && (
                            <p className="text-[10px] text-gray-400">→ {session.checkOut}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              <span>Hoàn thành</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>Đang làm</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              <span>Sắp tới</span>
            </div>
          </div>
          <span className="font-medium">Tuần {Math.ceil((new Date().getDate()) / 7)}/{new Date().getMonth() + 1}</span>
        </div>
      </div>
    </div>
  );
};

export default WorkSchedule;
