import React, { useState, useEffect } from 'react';
import { User, EvidenceItem, CheckInRecord } from '../types';
import { STORAGE_KEY_ATTENDANCE_RECORDS, STORAGE_KEY_DASHBOARD_COLLAPSED, GEOFENCE } from '../utils/constants';
import { getGeofenceStatus, GeofenceStatus } from '../hooks/useGeofenceMonitor';
import { safeParse } from '../hooks/usePersistentState';
import { ManagerCheckInToggle } from './ManagerCheckInToggle';

interface ManagerDashboardProps {
  currentUser: User;
  evidences: EvidenceItem[];
  allUsers: User[];
  onSelectEmployee: (user: User) => void;
  onNavigateReview: () => void;
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
  onSelectEmployee,
  onNavigateReview,
  onCheckIn
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeCheckInStatus[]>([]);
  const [geoStatus, setGeoStatus] = useState<GeofenceStatus>(() => getGeofenceStatus());

  // ─── Dashboard collapse (persisted) ───
  // Page state lives in React; the preference is also written to localStorage
  // so it survives screen changes AND app restarts (app-state behavior).
  const [dashboardCollapsed, setDashboardCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_DASHBOARD_COLLAPSED) === 'true';
  });

  const toggleDashboard = () => {
    setDashboardCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY_DASHBOARD_COLLAPSED, String(next)); } catch { /* storage full */ }
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  const checkedOutCount = employeeStatuses.filter(s => s.hasCheckedOut).length;
  const pendingReviewCount = evidences.filter(e => e.status === 'pending').length;
  const totalPoints = evidences.reduce((acc, e) => acc + e.points, 0);
  const avgTeamScore = totalEmployees > 0 ? Math.round(totalPoints / totalEmployees) : 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const months = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
      {/* Manager Time & Info Card */}
      <div className="bg-gradient-to-r from-[#000666] to-[#1a237e] text-white rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-[#4fc3f7]/10 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <div className="text-xs uppercase tracking-wider text-white/70 mb-1">QUẢN LÝ</div>
          <div className="font-headline text-4xl sm:text-5xl font-bold mb-2">{formatTime(currentTime)}</div>
          <div className="text-sm text-white/80">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Total Employees */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#000666] text-[20px]">group</span>
            <span className="text-xs text-[#454652] font-medium">Tổng nhân viên</span>
          </div>
          <div className="font-headline text-2xl font-bold text-[#000666]">{totalEmployees}</div>
        </div>

        {/* Checked In Today */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
            <span className="text-xs text-[#454652] font-medium">Đã check-in</span>
          </div>
          <div className="font-headline text-2xl font-bold text-green-600">{checkedInCount}</div>
          <div className="text-xs text-[#767683] mt-1">
            {checkedOutCount} đã check-out
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#000666]/50 transition-colors" onClick={onNavigateReview}>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-500 text-[20px]">pending</span>
            <span className="text-xs text-[#454652] font-medium">Đang xử lý</span>
          </div>
          <div className="font-headline text-2xl font-bold text-amber-500">{pendingReviewCount}</div>
          <div className="text-xs text-[#000666] mt-1 font-medium">Xem ngay →</div>
        </div>

        {/* Team Score */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#000666] text-[20px]">star</span>
            <span className="text-xs text-[#454652] font-medium">Điểm TB team</span>
          </div>
          <div className="font-headline text-2xl font-bold text-[#000666]">{avgTeamScore}</div>
          <div className="text-xs text-[#767683] mt-1">điểm/người</div>
        </div>
      </div>

      {/* Geofence — employees out of office range */}
      <div className={`bg-white border rounded-2xl p-5 mb-6 shadow-sm ${
        geoStatus.outOfRange.length > 0 ? 'border-[#FF3131]/40' : 'border-[#c6c5d4]/60'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline font-bold text-[#1b1b21] text-base">Ngoài phạm vi làm việc</h3>
            <p className="text-xs text-[#767683] mt-0.5">Nhân viên cách văn phòng hơn {GEOFENCE.alertRadiusM}m sau khi check-in</p>
          </div>
          <span className={`material-symbols-outlined text-[22px] ${
            geoStatus.outOfRange.length > 0 ? 'text-[#FF3131]' : 'text-[#000666]'
          }`}>
            location_off
          </span>
        </div>

        {geoStatus.outOfRange.length > 0 ? (
          <div className="space-y-2 mb-4">
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
        ) : (
          <p className="text-xs text-[#767683] mb-4">Tất cả nhân viên đang làm việc đều trong phạm vi văn phòng.</p>
        )}

        {/* Audit trail */}
        {geoStatus.recentEvents.length > 0 && (
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
      <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 mb-6 shadow-sm">
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
