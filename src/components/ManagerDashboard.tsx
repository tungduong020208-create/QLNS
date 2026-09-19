import React, { useState, useEffect } from 'react';
import { User, EvidenceItem, CheckInRecord } from '../types';
import { Shift } from './screens/ManagerScheduleScreen';
import { getMonday, toDateStr } from '../utils/schedule';
import { useShiftCapacity } from '../hooks/useShiftCapacity';
import { STORAGE_KEY_ATTENDANCE_RECORDS, STORAGE_KEY_DASHBOARD_COLLAPSED, GEOFENCE } from '../utils/constants';

/** Thứ tự 3 ca cố định — dùng để đếm slot trống cho từng ca trong ngày. */
const SHIFT_NAMES = ['Ca sáng', 'Ca chiều', 'Ca tối'] as const;
import { getGeofenceStatus, GeofenceStatus } from '../hooks/useGeofenceMonitor';
import { safeParse } from '../hooks/usePersistentState';
import { ManagerCheckInToggle } from './ManagerCheckInToggle';

interface ManagerDashboardProps {
  currentUser: User;
  evidences: EvidenceItem[];
  allUsers: User[];
  shifts: Shift[];
  onSelectEmployee: (user: User) => void;
  onNavigateSchedule: () => void;
  onCheckIn?: (record: CheckInRecord) => void;
}

interface EmployeeCheckInStatus {
  user: User;
  checkInRecord: CheckInRecord | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currentUser,
  evidences,
  allUsers,
  shifts,
  onSelectEmployee,
  onNavigateSchedule,
  onCheckIn
}) => {
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeCheckInStatus[]>([]);
  const [geoStatus, setGeoStatus] = useState<GeofenceStatus>(() => getGeofenceStatus());

  // ─── Dashboard collapse (persisted) ───
  // Page state lives in React; the preference is also written to localStorage
  // so it survives screen changes AND app restarts (app-state behavior).
  const [dashboardCollapsed, setDashboardCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_DASHBOARD_COLLAPSED) === 'true';
  });

  // Geofence block: compact by default when there's nothing to act on —
  // the user can still expand it to read the audit trail.
  const [geoExpanded, setGeoExpanded] = useState(false);

  const toggleDashboard = () => {
    setDashboardCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY_DASHBOARD_COLLAPSED, String(next)); } catch { /* storage full */ }
      return next;
    });
  };

  useEffect(() => {
    // Refresh geofence panel (out-of-range employees + audit trail)
    const refresh = () => setGeoStatus(getGeofenceStatus());
    refresh();
    const geoTimer = setInterval(refresh, 30 * 1000);
    return () => clearInterval(geoTimer);
  }, []);

  useEffect(() => {
    const readAttendance = () => {
      // CRITICAL FIX: Use unified storage key (previously 'coffeehouse_checkin_records'
      // which didn't match what CheckInCheckOut.tsx was writing to)
      const allCheckInRecords = safeParse<Record<string, CheckInRecord[]>>(STORAGE_KEY_ATTENDANCE_RECORDS, {});

      const employees = allUsers.filter(u => u.role === 'employee');
      const statuses: EmployeeCheckInStatus[] = employees.map(emp => {

        // Get actual check-in records for this employee
        const empRecords = allCheckInRecords[emp.id] || [];
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = empRecords.filter(r => {
          const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
          return recordDate === today;
        });

        const lastCheckIn = todayRecords.find(r => r.type === 'checkin');
        const lastCheckOut = todayRecords.find(r => r.type === 'checkout');
        const hasCheckedIn = !!lastCheckIn;
        const hasCheckedOut = !!lastCheckOut;

        return {
          user: emp,
          checkInRecord: lastCheckIn || null,
          hasCheckedIn,
          hasCheckedOut,
        };
      });
      setEmployeeStatuses(statuses);
    };

    readAttendance();

    // Same-device sync: the browser `storage` event fires in every OTHER tab
    // when a tab writes localStorage — so an employee checking in on another
    // tab updates this dashboard instantly. The 30s poll covers tabs that
    // opened before the listener existed, edge cases, and safety net.
    // (Cross-DEVICE sync still requires a shared backend — see docs/backend-plan.md)
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY_ATTENDANCE_RECORDS) readAttendance();
    };
    window.addEventListener('storage', onStorage);
    const pollTimer = setInterval(readAttendance, 30 * 1000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(pollTimer);
    };
  }, [allUsers, evidences]);

  const totalEmployees = allUsers.filter(u => u.role === 'employee').length;
  const checkedInCount = employeeStatuses.filter(s => s.hasCheckedIn).length;

  // ── "Ca còn trống" — số slot chưa ai lấp trong TUẦN LÀM VIỆC hiện tại.
  // WHY this replaced "Điểm TB team": averaging evidence points per person
  // has no HR meaning (evidences are per-event approvals, not a per-person
  // score) and the number never drives an action. Unfilled capacity is the
  // opposite: a manager who sees "5 ca trống" can DO something today — assign
  // staff or ask them to register. It also reuses the exact capacity logic
  // the scheduler enforces (getCapacityForDate), so the dashboard number
  // cannot drift from the rules.
  const { capacityOverrides, getCapacityForDate } = useShiftCapacity();
  const weekStartMs = new Date(toDateStr(getMonday(new Date())) + 'T00:00:00').getTime();
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
  const weekShifts = shifts.filter(s => {
    const t = new Date(s.date + 'T00:00:00').getTime();
    return t >= weekStartMs && t < weekEndMs;
  });
  const openShiftSlots = Array.from(new Set(weekShifts.map(s => s.date))).reduce((total, date) => {
    return total + SHIFT_NAMES.reduce((dayTotal, shiftName) => {
      const assigned = weekShifts.filter(
        s => s.date === date && s.shiftName === shiftName && s.status !== 'cancelled' && s.status !== 'swapped'
      ).length;
      const capacity = getCapacityForDate(capacityOverrides, date, shiftName);
      return dayTotal + Math.max(0, capacity - assigned);
    }, 0);
  }, 0);

  // Geofence block is "alerting" only when someone is actually out of range;
  // otherwise it collapses to a single-line status.
  const geoAlertActive = geoStatus.outOfRange.length > 0;

  // ── Card 1: check-in rate — the ratio IS the instruction (see who's missing).
  const checkInRate = totalEmployees > 0 ? Math.round((checkedInCount / totalEmployees) * 100) : 0;
  const notCheckedInCount = Math.max(0, totalEmployees - checkedInCount);

  // ── Card 4: warnings = ngoài vùng + đi trễ hôm nay.
  // "Đi trễ" = check-in sau giờ bắt đầu của ca SỚM NHẤT trong ngày mà NV có
  // lịch (ngày nghỉ không tính trễ). Grace = 0 phút: manager nhìn giờ cụ thể
  // và tự đánh giá — metric không tự tiện tha thứ.
  const todayLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const lateCount = employeeStatuses.filter(s => {
    if (!s.checkInRecord) return false;
    const dayShifts = shifts.filter(
      sh => sh.employeeId === s.user.id && sh.date === todayLocal &&
            sh.status !== 'cancelled' && sh.status !== 'swapped'
    );
    if (dayShifts.length === 0) return false;
    const earliestStart = dayShifts.map(sh => sh.startTime).sort()[0]; // 'HH:MM' sorts correctly as text
    const [h, m] = earliestStart.split(':').map(Number);
    const t = new Date(s.checkInRecord.timestamp);
    return t.getHours() > h || (t.getHours() === h && t.getMinutes() > m);
  }).length;
  const warningCount = geoStatus.outOfRange.length + lateCount;

  // Card clicks take you to the block where the number becomes actionable.
  const scrollToStatus = () =>
    document.getElementById('employee-status-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToWarnings = () => {
    setGeoExpanded(true);
    requestAnimationFrame(() =>
      document.getElementById('geofence-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-5xl mx-auto w-full antialiased">
      {/* Greeting + dashboard collapse toggle */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1b1b21] tracking-tight">
            Xin chào, {currentUser.name}
          </h1>
          <p className="text-sm text-[#454652] mt-1">
            Quản lý tổng quan và theo dõi hiệu suất nhân viên
          </p>
        </div>
        <button
          onClick={toggleDashboard}
          title={dashboardCollapsed ? 'Mở rộng dashboard' : 'Thu gọn dashboard'}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-[#c6c5d4]/60 flex items-center justify-center text-[#454652] hover:bg-[#f0eef5] transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[22px]">
            {dashboardCollapsed ? 'expand_more' : 'expand_less'}
          </span>
        </button>
      </div>

      {/* Manager check-in/check-out toggle (dedicated manager attendance switch) */}
      <ManagerCheckInToggle employeeId={currentUser.id} onCheckIn={onCheckIn || (() => {})} />

      {/* Collapsible dashboard content — hidden while collapsed, only the title bar above remains */}
      {!dashboardCollapsed && (
      <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Check-in rate today — click → the list of who's missing. */}
        <div
          className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#000666]/50 transition-colors"
          onClick={scrollToStatus}
          title="Xem ai chưa check-in"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined text-[20px] ${checkInRate === 100 ? 'text-green-600' : 'text-[#000666]'}`}>how_to_reg</span>
            <span className="text-xs text-[#454652] font-medium">Check-in hôm nay</span>
          </div>
          <div className={`font-headline text-2xl font-bold ${checkInRate === 100 ? 'text-green-600' : 'text-[#000666]'}`}>{checkInRate}%</div>
          <div className="text-xs text-[#767683] mt-1">
            {checkedInCount}/{totalEmployees} đã vào{notCheckedInCount > 0 ? ` · ${notCheckedInCount} chưa` : ''}
          </div>
        </div>

        {/* Open Shift Slots — replaced the meaningless "team average score"
            (see computation comment above). Clickable because it is an
            instruction, not a statistic. */}
        <div
          className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#000666]/50 transition-colors"
          onClick={onNavigateSchedule}
          title="Xem lịch và xếp ca"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined text-[20px] ${openShiftSlots > 0 ? 'text-amber-500' : 'text-[#000666]'}`}>event_available</span>
            <span className="text-xs text-[#454652] font-medium">Ca còn trống</span>
          </div>
          <div className={`font-headline text-2xl font-bold ${openShiftSlots > 0 ? 'text-amber-500' : 'text-[#000666]'}`}>{openShiftSlots}</div>
          <div className="text-xs text-[#000666] mt-1 font-medium">Tuần này · Xếp ca →</div>
        </div>

        {/* Warnings (late arrivals + out-of-range) — only clickable when
            there is something to act on (quiet-state pattern). */}
        {warningCount > 0 ? (
          <div
            className="bg-white border border-[#FF3131]/40 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#FF3131]/70 transition-colors"
            onClick={scrollToWarnings}
            title="Xem chi tiết cảnh báo"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#FF3131] text-[20px]">notification_important</span>
              <span className="text-xs text-[#454652] font-medium">Cảnh báo</span>
            </div>
            <div className="font-headline text-2xl font-bold text-[#FF3131]">{warningCount}</div>
            <div className="text-xs text-[#767683] mt-1">
              {geoStatus.outOfRange.length} ngoài vùng · {lateCount} đi trễ
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-green-600 text-[20px]">verified</span>
              <span className="text-xs text-[#454652] font-medium">Cảnh báo</span>
            </div>
            <div className="font-headline text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-[#767683] mt-1">Không có vi phạm hôm nay</div>
          </div>
        )}
      </div>

      {/* Geofence — compact single-line status when all is well (no news is
          not news, it's noise); full alert UI only when someone is out of
          range. The audit trail stays reachable via the expander. */}
      <div id="geofence-block" className={`bg-white border rounded-2xl mb-6 shadow-sm ${
        geoAlertActive ? 'border-[#FF3131]/40 p-5' : 'border-[#c6c5d4]/60 p-3'
      }`}>
        <div className={`flex items-center justify-between ${geoAlertActive ? 'mb-4' : ''}`}>
          <div>
            <h3 className={`font-headline font-bold text-[#1b1b21] ${geoAlertActive ? 'text-base' : 'text-sm'}`}>
              {geoAlertActive ? 'Ngoài phạm vi làm việc' : 'Phạm vi làm việc: tất cả OK'}
            </h3>
            {geoAlertActive && (
              <p className="text-xs text-[#767683] mt-0.5">Nhân viên cách văn phòng hơn {GEOFENCE.alertRadiusM}m sau khi check-in</p>
            )}
          </div>
          {geoAlertActive ? (
            <span className="material-symbols-outlined text-[22px] text-[#FF3131]">location_off</span>
          ) : (
            <button
              onClick={() => setGeoExpanded(v => !v)}
              title={geoExpanded ? 'Thu gọn' : 'Xem chi tiết và lịch sử cảnh báo'}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f9f8fc] border border-[#c6c5d4]/60 flex items-center justify-center text-[#454652] hover:bg-[#f0eef5] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">{geoExpanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          )}
        </div>

        {geoAlertActive && (
          <div id="out-of-range-list" className="space-y-2 mb-4">
            {geoStatus.outOfRange.map(entry => (
              <div key={entry.employeeId} className="flex items-center gap-3 p-3 bg-[#FF3131]/5 border border-[#FF3131]/20 rounded-xl">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[#FF3131]/30 flex-shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    src={allUsers.find(u => u.id === entry.employeeId)?.avatar || ''}
                    alt={entry.employeeName}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#1b1b21] truncate">{entry.employeeName}</div>
                  <div className="text-xs text-[#767683]">
                    Từ {new Date(entry.since).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {entry.repeatCount > 0 && ` • nhắc lại ${entry.repeatCount} lần`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-headline font-bold text-[#FF3131] tabular-nums">{entry.distanceMeters}m</div>
                  <a
                    className="text-[10px] text-[#000666] font-medium hover:underline"
                    href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Xem bản đồ →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!geoAlertActive && geoExpanded && (
          <p className="text-xs text-[#767683] mb-3">Tất cả nhân viên đang làm việc đều trong phạm vi văn phòng (≤ {GEOFENCE.alertRadiusM}m).</p>
        )}

        {/* Audit trail */}
        {(geoAlertActive || geoExpanded) && geoStatus.recentEvents.length > 0 && (
          <div className="border-t border-[#e6e4ee] pt-3">
            <p className="text-[10px] font-semibold text-[#767683] uppercase tracking-wider mb-2">Lịch sử cảnh báo</p>
            <div className="space-y-1.5">
              {geoStatus.recentEvents.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center gap-2 text-xs">
                  <span className={`material-symbols-outlined text-[14px] ${event.isRepeat ? 'text-amber-500' : 'text-[#FF3131]'}`}>
                    {event.isRepeat ? 'notifications_active' : 'warning'}
                  </span>
                  <span className="text-[#1b1b21] font-medium flex-shrink-0">{event.employeeName}</span>
                  <span className="text-[#767683] truncate">
                    {new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} — cách {event.distanceMeters}m{event.isRepeat ? ' (lặp lại)' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Check-in Status */}
      <div id="employee-status-block" className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline font-bold text-[#1b1b21] text-base">Trạng thái nhân viên hôm nay</h3>
            <p className="text-xs text-[#767683] mt-0.5">Theo dõi check-in/check-out real-time</p>
          </div>
          <span className="material-symbols-outlined text-[#000666] text-[22px]">visibility</span>
        </div>

        <div className="space-y-3">
          {employeeStatuses.map(status => (
            <div 
              key={status.user.id} 
              className="flex items-center gap-3 p-3 bg-[#f9f8fc] rounded-xl hover:bg-[#f0eef5] transition-colors cursor-pointer"
              onClick={() => onSelectEmployee(status.user)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c6c5d4] flex-shrink-0">
                <img className="w-full h-full object-cover" src={status.user.avatar} alt={status.user.name} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#1b1b21] truncate">{status.user.name}
                </div>
                <div className="text-xs text-[#767683]">{status.user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</div>
              </div>
              <div className="flex items-center gap-2">
                {/* Check-in method badge */}
                {status.checkInRecord?.checkInMethod && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    status.checkInRecord.checkInMethod === 'photo' ? 'text-green-600 bg-green-100' :
                    status.checkInRecord.checkInMethod === 'gps' ? 'text-blue-600 bg-blue-100' :
                    'text-amber-600 bg-amber-100'
                  }`}>
                    {status.checkInRecord.checkInMethod === 'photo' ? '📸' :
                     status.checkInRecord.checkInMethod === 'gps' ? '📍' : '🔢'}
                  </span>
                )}
                {status.hasCheckedOut ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#767683] bg-gray-100 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">logout</span>Đã về
                  </span>
                ) : status.hasCheckedIn ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">login</span>Đang làm
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>Chưa vào
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
