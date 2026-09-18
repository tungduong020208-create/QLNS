/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * App — routing + composition ONLY.
 *
 * All data domains live in custom hooks under src/hooks, each owning its
 * slice of localStorage via usePersistentState:
 *   useAuth          → users + session
 *   useEvidences     → evidence submissions & reviews
 *   useNotifications → notification center
 *   useAttendance    → check-in/out work-hours records
 *   useShifts        → published shift rows
 *   useScheduling    → registrations, study schedules, manual assignments
 *   useSocial        → news feed reactions & comments
 *   useReviews       → peer reviews
 *   useToasts        → transient toast queue (UI only)
 *
 * What remains here is exactly what a root component should own: which
 * routes exist, which screens get which slice of state, and the small
 * orchestration handlers that span multiple domains (e.g. reviewing an
 * evidence also creates a notification and a toast).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, EvidenceItem, CheckInRecord, NotificationItem, GeofenceEvent } from './types';
import { ROUTES, getDefaultHomeRoute } from './routes';
import { weekEndOf } from './utils/schedule';
import { computeAutoSchedule } from './utils/autoSchedule';
import { getCapacityForDate } from './hooks/useShiftCapacity';
import { useShiftCapacity } from './hooks/useShiftCapacity';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/screens/LoginScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ReviewScreen } from './components/screens/ReviewScreen';
import { ApprovalsScreen } from './components/screens/ApprovalsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { EvidenceDetailModal } from './components/modals/EvidenceDetailModal';
import { ToastNotification } from './components/modals/ToastNotification';
import { ManagerDashboard } from './components/ManagerDashboard';
import { EmployeeDetailModal } from './components/modals/EmployeeDetailModal';
import { WorkHoursScreen } from './components/screens/WorkHoursScreen';
import { StudyScheduleScreen } from './components/screens/StudyScheduleScreen';
import { ManagerStudySchedulesScreen } from './components/screens/ManagerStudySchedulesScreen';
import { PeerReviewScreen } from './components/screens/PeerReviewScreen';
import { ManagerScheduleTab } from './components/screens/ManagerScheduleTab';
import { ExportReportScreen } from './components/screens/ExportReportScreen';
import { AddEmployeeModal } from './components/modals/AddEmployeeModal';
import { useGeofenceMonitor } from './hooks/useGeofenceMonitor';
import { useToasts } from './hooks/useToasts';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useEvidences } from './hooks/useEvidences';
import { useAttendance } from './hooks/useAttendance';
import { useShifts } from './hooks/useShifts';
import { useScheduling } from './hooks/useScheduling';
import { useSocial } from './hooks/useSocial';
import { useReviews } from './hooks/useReviews';
import { WorkHoursSummary } from './types';

export default function App() {
  const navigate = useNavigate();

  // ─── Domain state (each hook owns its localStorage slice) ───
  const auth = useAuth();
  const { currentUser } = auth;
  const { notifications, pushNotification, markRead, markAllRead } = useNotifications();
  const { evidences, submitEvidence: submitEvidenceRaw, reviewEvidence } = useEvidences();
  const { checkInOutRecords, addCheckIn, addCheckOut } = useAttendance();
  const { shifts, addShift, updateShift, deleteShift, setShifts } = useShifts();
  // Capacity per (date, shift) — manager-adjustable; engine + employee UI
  // both read the SAME numbers through getCapacityForDate.
  const { capacityOverrides, setCapacityForDate } = useShiftCapacity();
  const {
    shiftRegistrations, submitRegistration, updateRegistration,
    studySchedules, submitStudySchedule,
    manualAssignments, publishSchedule,
  } = useScheduling();
  const { peerReviews, submitPeerReview } = useReviews();
  const { postReactions, postComments, toggleReaction, addComment, deleteComment } = useSocial(currentUser);
  const { toasts, addToast, dismissToast } = useToasts();

  // ─── UI state (composition-level: modals + last check-in/out record) ───
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [checkInRecord, setCheckInRecord] = useState<CheckInRecord | null>(null);

  // ─── Orchestration handlers (cross-domain, kept here) ───

  const handleLogin = (user: User) => {
    auth.login(user);
    addToast('success', 'Đăng nhập thành công', `Chào mừng ${user.name} trở lại hệ thống`);
    navigate(getDefaultHomeRoute(user.role), { replace: true });
  };

  const handleLogout = () => {
    // Auth/session keys are cleared by the hook; persistent data like
    // notifications and evidences are intentionally kept.
    auth.logout();
    addToast('info', 'Đã đăng xuất', 'Phiên làm việc đã kết thúc an toàn');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleAddEmployee = (newEmployee: User) => {
    auth.addUser(newEmployee);
    addToast('success', 'Tạo tài khoản thành công', `Tài khoản ${newEmployee.name} (${newEmployee.employeeCode}) đã được tạo`);
    setShowAddEmployeeModal(false);
  };

  const handlePasswordChanged = (userId: string, newPassword: string) => {
    auth.changePassword(userId, newPassword);
  };

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    auth.updateUser(updatedFields);
    addToast('success', 'Đã lưu thông tin', 'Hồ sơ cá nhân đã được cập nhật thành công');
  };

  const handleSubmitEvidence = (newEvidence: EvidenceItem) => {
    submitEvidenceRaw(newEvidence);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Đã gửi minh chứng',
      message: `Minh chứng "${newEvidence.title}" đã được chuyển đến cấp quản lý duyệt.`,
      time: 'Vừa xong',
      read: false,
      type: 'pending',
      category: 'management'
    };
    pushNotification(newNotif);
    addToast('success', 'Nộp minh chứng thành công', 'Minh chứng đã được gửi đến bộ phận quản lý');
    navigate(currentUser?.role === 'manager' ? ROUTES.MANAGER_DASHBOARD : ROUTES.EMPLOYEE_HOME, { replace: true });
  };

  const handleReviewEvidence = (evidenceId: string, status: 'good' | 'bad', points: number, note: string) => {
    if (!currentUser) return;
    const target = evidences.find(e => e.id === evidenceId);
    if (target && target.employeeId === currentUser.id) {
      addToast('error', 'Không thể duyệt', 'Bạn không thể duyệt minh chứng của chính mình');
      return;
    }
    reviewEvidence({ evidenceId, status, points, note, reviewerName: currentUser.name });
    if (target) {
      const notifItem: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: status === 'good' ? 'Minh chứng được duyệt TỐT' : 'Minh chứng bị đánh giá CHƯA TỐT',
        message: `Minh chứng "${target.title}" đã được ${currentUser.name} duyệt (${status === 'good' ? `+${points}` : `${points}`} điểm). Nhận xét: "${note}"`,
        time: 'Vừa xong',
        read: false,
        type: status === 'good' ? 'reward' : 'penalty',
        category: 'management'
      };
      pushNotification(notifItem);
    }
    addToast(status === 'good' ? 'success' : 'error', status === 'good' ? 'Đã duyệt TỐT' : 'Đã đánh giá CHƯA TỐT', `Đã cập nhật ${status === 'good' ? `+${points}` : `${points}`} điểm cho nhân viên`);
  };

  // ─── Check-in / check-out orchestration ───

  const handleCheckIn = (record: CheckInRecord) => {
    setCheckInRecord(record);
    addCheckIn(currentUser?.id || '');
    addToast('success', 'Điểm danh thành công', `Check-in lúc ${record.time} đã được ghi nhận`);
  };

  const handleCheckOut = (record: CheckInRecord) => {
    setCheckInRecord(record);
    addCheckOut(currentUser?.id || '');
    addToast('success', 'Điểm danh thành công', `Check-out lúc ${record.time} đã được ghi nhận`);
  };

  /** Shared by employee camera flow and manager toggle. */
  const handleCheckInOutRecord = (record: CheckInRecord) => {
    if (record.type === 'checkin') {
      handleCheckIn(record);
    } else {
      handleCheckOut(record);
    }
  };

  // ─── Work hours summary (derived data across users + attendance) ───

  const getWorkHoursSummary = (yearMonth: string): WorkHoursSummary[] => {
    const employees = auth.users.filter(u => u.role !== 'manager');
    return employees.map(emp => {
      const empRecords = checkInOutRecords.filter(
        r => r.userId === emp.id && r.date.startsWith(yearMonth)
      );
      const totalHours = empRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
      return {
        userId: emp.id,
        userName: emp.name,
        userAvatar: emp.avatar,
        employeeCode: emp.employeeCode,
        month: yearMonth,
        totalHours: Math.round(totalHours * 100) / 100,
        checkInCount: empRecords.filter(r => r.checkOutTime).length,
        records: empRecords,
      };
    });
  };

  // ─── Geofence: manager alerts when an employee leaves office radius ───

  const handleGeofenceOutOfRange = (event: GeofenceEvent) => {
    const time = new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const notifItem: NotificationItem = {
      id: `notif-geo-${event.id}`,
      title: event.isRepeat ? '⚠️ Vẫn ngoài phạm vi làm việc' : '⚠️ Nhân viên ngoài phạm vi làm việc',
      message: `${event.employeeName} đang ở cách văn phòng ${event.distanceMeters}m (ngưỡng ${event.thresholdMeters}m) lúc ${time}. Trạng thái: đang trong ca làm việc.`,
      time: 'Vừa xong',
      read: false,
      type: 'penalty',
      category: 'management',
    };
    pushNotification(notifItem);
  };

  useGeofenceMonitor(currentUser, handleGeofenceOutOfRange);

  // ─── Shift & schedule handlers ───

  const handleAddShift = (shift: Parameters<typeof addShift>[0]) => {
    addShift(shift);
    addToast('success', 'Đã thêm ca mới', `Ca ${shift.shiftName} cho ${shift.employeeName}`);
  };

  const handleUpdateShift = (updatedShift: Parameters<typeof updateShift>[0]) => {
    updateShift(updatedShift);
    addToast('success', 'Đã cập nhật ca', `Ca ${updatedShift.shiftName} đã được chỉnh sửa`);
  };

  const handleDeleteShift = (shiftId: string) => {
    deleteShift(shiftId);
    addToast('info', 'Đã xóa ca', 'Ca làm việc đã bị xóa');
  };

  const handleSwapShifts = (a: Parameters<typeof updateShift>[0], b: Parameters<typeof updateShift>[0]) => {
    // Two identity-swapped rows go through the same update path as a normal
    // edit — one toast, one persistence write, no special-casing.
    updateShift(a);
    updateShift(b);
    addToast('success', 'Đã hoán đổi ca', `${a.employeeName} ↔ ${b.employeeName} (ngày ${a.date})`);
  };

  const handleSubmitRegistration = (reg: Parameters<typeof submitRegistration>[0]) => {
    // AUTO-SCHEDULING: no manager gate. The saved registration is applied to
    // the official schedule immediately by a pure rules engine — placed days
    // become shift rows, blocked days become conflicts on the registration.
    // Khung giờ map theo LOẠI NHÂN VIÊN của chính người đăng ký (tra users,
    // không phải currentUser — manager cũng có thể nộp hộ) và capacity check
    // dùng đúng số max từng (ngày, ca) mà manager đã chỉnh.
    const employee = auth.users.find((u) => u.id === reg.userId);
    const resolveCapacity = (date: string, shiftName: string) =>
      getCapacityForDate(capacityOverrides, date, shiftName);
    const result = computeAutoSchedule(
      reg, shifts, reg.userName, reg.userAvatar,
      employee?.employmentType, resolveCapacity
    );
    setShifts(result.shifts);

    const nowIso = new Date().toISOString();
    const fullyPlaced = result.conflicts.length === 0;
    const processedReg = {
      ...reg,
      status: fullyPlaced ? ('approved' as const) : reg.status,
      approvedAt: fullyPlaced ? nowIso : reg.approvedAt,
      approvedBy: fullyPlaced ? 'system (tự động)' : reg.approvedBy,
      autoSchedule: {
        assignedCount: result.assignedCount,
        conflicts: result.conflicts,
        processedAt: nowIso,
      },
    };

    submitRegistration(processedReg);

    if (fullyPlaced) {
      addToast('success', 'Đăng ký thành công', `Đã tự động xếp ${result.assignedCount} ca vào lịch tuần ${reg.weekNumber}`);
    } else {
      addToast('error', 'Đăng ký một phần', `${result.assignedCount} ca đã xếp, ${result.conflicts.length} ca chưa xếp được (ca đầy hoặc trùng) — chờ quản lý xử lý`);
      pushNotification({
        id: `notif-autosched-${reg.id}`,
        title: '⚠️ Có đăng ký chưa xếp được',
        message: `${reg.userName} đăng ký tuần ${reg.weekNumber}: ${result.assignedCount} ca đã tự xếp, ${result.conflicts.length} ca chưa xếp được (${result.conflicts.map(c => c.date).join(', ')}).`,
        time: 'Vừa xong',
        read: false,
        type: 'pending',
        category: 'management',
      });
    }
  };

  const handleUpdateRegistration = (reg: Parameters<typeof updateRegistration>[0]) => {
    // Resubmission (employee edits their week, or manager tweaks a reg):
    // re-run the same engine — auto rows for that employee+week are replaced,
    // manual (manager) rows are preserved, capacity re-checked.
    const employee = auth.users.find((u) => u.id === reg.userId);
    const resolveCapacity = (date: string, shiftName: string) =>
      getCapacityForDate(capacityOverrides, date, shiftName);
    const result = computeAutoSchedule(
      reg, shifts, reg.userName, reg.userAvatar,
      employee?.employmentType, resolveCapacity
    );
    setShifts(result.shifts);

    const nowIso = new Date().toISOString();
    const fullyPlaced = result.conflicts.length === 0;
    const processedReg = {
      ...reg,
      status: fullyPlaced ? ('approved' as const) : reg.status,
      approvedAt: fullyPlaced ? nowIso : reg.approvedAt,
      approvedBy: fullyPlaced ? 'system (tự động)' : reg.approvedBy,
      autoSchedule: {
        assignedCount: result.assignedCount,
        conflicts: result.conflicts,
        processedAt: nowIso,
      },
    };

    updateRegistration(processedReg);
    addToast(
      fullyPlaced ? 'success' : 'error',
      fullyPlaced ? 'Đã cập nhật' : 'Cập nhật một phần',
      fullyPlaced
        ? 'Lịch làm việc đã được cập nhật'
        : `${result.assignedCount} ca đã xếp, ${result.conflicts.length} ca chưa xếp được — chờ quản lý xử lý`
    );
  };

  const handlePublishSchedule = (assignment: Parameters<typeof publishSchedule>[0]) => {
    publishSchedule(assignment);

    // UNIFIED DATA LAYER: a published schedule must land in the same store
    // the employee's schedule views read from (STORAGE_KEY_SHIFTS). Previously
    // this only wrote to 'aiicafe_manual_assignments' — a parallel store the
    // employee side never reads — so the employee's schedule did not update
    // when the manager published one. This handler is the single WRITE path
    // that keeps both roles on one source of truth.
    setShifts(prev => {
      // PER-DATE RECONCILE, not a week wipe. The employee's auto rows for
      // days the manager did NOT touch must survive — otherwise publishing
      // one day silently cancels the auto-placed shifts of every other day.
      // Rule per date inside the week: rows on a date present in
      // `assignment.shifts` are replaced; dates listed in `clearedDates`
      // (manager explicitly removed the shift) are dropped; all other dates
      // keep their existing rows.
      const weekEnd = weekEndOf(assignment.weekStart);
      const cleared = new Set(assignment.clearedDates ?? []);
      const others = prev.filter(
        s => !(s.employeeId === assignment.userId &&
               s.date >= assignment.weekStart &&
               s.date <= weekEnd) ||
               (!cleared.has(s.date) &&
                !assignment.shifts.some(ps => ps.date === s.date))
      );
      const published = assignment.shifts.map(s => {
        const user = auth.users.find(u => u.id === assignment.userId);
        return {
          id: `shift-${assignment.userId}-${s.date}-${s.shiftName}`,
          employeeId: assignment.userId,
          employeeName: user?.name || assignment.userName,
          employeeAvatar: user?.avatar || assignment.userAvatar,
          date: s.date,
          shiftName: s.shiftName,
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'scheduled' as const,
          // Manager-published rows are manual: they survive the employee's
          // next resubmission (manual beats auto).
          origin: 'manual' as const,
        };
      });
      return [...others, ...published];
    });

    addToast('success', 'Đã xuất bản lịch', `Lịch làm việc đã được cập nhật cho ${assignment.userName}`);
  };

  // ─── Navigation helper (passed to child components) ───

  const goTo = (tab: string) => {
    if (!currentUser) return;
    const role = currentUser.role;
    const routeMap: Record<string, Record<string, string>> = {        manager: {
        home: ROUTES.MANAGER_DASHBOARD,
        manager_schedule: ROUTES.MANAGER_SCHEDULE,
        work_hours: ROUTES.MANAGER_WORK_HOURS,
        // study_schedules is now a sub-tab of "Quản lý" — resolved to the
        // schedule tab so any stale caller lands in the right place.
        study_schedules: ROUTES.MANAGER_SCHEDULE + '/study',
        // 'review' (the Bảng Tin entry) now lands the manager on the APPROVAL
        // queue — the social feed keeps its own entry ('feed').
        review: ROUTES.MANAGER_APPROVALS,
        feed: ROUTES.MANAGER_HANDOVER,
        peer_review: ROUTES.MANAGER_PEER_REVIEW,
        export_report: ROUTES.MANAGER_EXPORT,
        profile: ROUTES.MANAGER_PROFILE,
      },
      employee: {
        home: ROUTES.EMPLOYEE_HOME,
        // 'feed' is the shared "Bảng Tin" tab id; 'review' kept for legacy callers.
        feed: ROUTES.EMPLOYEE_HANDOVER,
        review: ROUTES.EMPLOYEE_HANDOVER,
        peer_review: ROUTES.EMPLOYEE_PEER_REVIEW,
        study_schedule: ROUTES.EMPLOYEE_SHIFT_REGISTRATION,
        profile: ROUTES.EMPLOYEE_PROFILE,
      },
    };
    const route = routeMap[role]?.[tab];
    if (route) navigate(route);
  };

  const pendingReviewCount = evidences.filter(e => e.status === 'pending').length;

  // ─── Layout wrapper for authenticated pages ───
  // The wrapper reads its latest values through a ref so the component's
  // identity stays STABLE across App renders. Without this, every App-level
  // state change (e.g. reacting/commenting on the news feed) re-created the
  // component type and remounted the whole page subtree, resetting local UI
  // state such as open comment sections and the feed's date filter.
  const layoutDepsRef = useRef({ currentUser, notifications, markRead, markAllRead, goTo, handleLogout, pendingReviewCount });
  layoutDepsRef.current = { currentUser, notifications, markRead, markAllRead, goTo, handleLogout, pendingReviewCount };

  const AuthenticatedLayout = useMemo(() => ({ children }: { children: React.ReactNode }) => {
    const { currentUser, notifications, markRead, markAllRead, goTo, handleLogout, pendingReviewCount } = layoutDepsRef.current;
    if (!currentUser) return null;
    return (
      <div className="min-h-screen bg-[#FDF8EE] text-[#3D4663] flex flex-col md:flex-row">
        <Header
          currentUser={currentUser}
          notifications={notifications}
          onMarkNotificationRead={markRead}
          onClearAllNotifications={markAllRead}
          onNavigateToProfile={() => goTo('profile')}
          onLogout={handleLogout}
        />
        <Sidebar
          currentUser={currentUser}
          pendingReviewCount={pendingReviewCount}
          onNavigate={goTo}
        />
        <main className="flex-1 md:ml-64 min-h-screen pb-20 md:pb-0">
          {children}
        </main>
        <BottomNav
          currentUser={currentUser}
          pendingReviewCount={pendingReviewCount}
          onNavigate={goTo}
        />
      </div>
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF8EE]">
      <Routes>
        {/* Public: Login page */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <GuestRoute currentUser={currentUser} isLoggedIn={auth.isLoggedIn}>
              <LoginScreen onLogin={handleLogin} allUsers={auth.users} onPasswordChanged={handlePasswordChanged} />
            </GuestRoute>
          }
        />

        {/* Root: Redirect based on role */}
        <Route
          path={ROUTES.HOME}
          element={
            <ProtectedRoute currentUser={currentUser} isLoggedIn={auth.isLoggedIn}>
              {currentUser ? (
                <AuthenticatedLayout>
                  <Routes>
                    {currentUser.role === 'manager' ? (
                      <Route index element={
                        <ManagerDashboard
                          currentUser={currentUser}
                          evidences={evidences}
                          allUsers={auth.users}
                          shifts={shifts}
                          onSelectEmployee={setSelectedEmployee}
                          onNavigateReview={() => goTo('review')}
                          onNavigateSchedule={() => goTo('manager_schedule')}
                          onCheckIn={handleCheckInOutRecord}
                        />
                      } />
                    ) : (
                      <Route index element={
                        <HomeScreen
                          currentUser={currentUser}
                          peerReviews={peerReviews}
                          onCheckIn={handleCheckInOutRecord}
                          shifts={shifts}
                        />
                      } />
                    )}
                  </Routes>
                </AuthenticatedLayout>
              ) : null}
            </ProtectedRoute>
          }
        />

        {/* Employee routes */}
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute currentUser={currentUser} isLoggedIn={auth.isLoggedIn} requiredRole="employee">
              {currentUser && (
                <AuthenticatedLayout>
                  <Routes>
                    <Route path="home" element={
                      <HomeScreen
                        currentUser={currentUser}
                        peerReviews={peerReviews}
                        onCheckIn={handleCheckInOutRecord}
                        shifts={shifts}
                      />
                    } />
                    <Route path="handover" element={
                      <ReviewScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        notifications={notifications}
                        onMarkNotificationRead={markRead}
                        onSubmitEvidence={handleSubmitEvidence}
                        postReactions={postReactions}
                        postComments={postComments}
                        onTogglePostReaction={toggleReaction}
                        onAddPostComment={addComment}
                        onDeletePostComment={deleteComment}
                      />
                    } />
                    <Route path="peer-review" element={
                      <PeerReviewScreen
                        currentUser={currentUser}
                        allUsers={auth.users}
                        peerReviews={peerReviews}
                        onSubmitReview={submitPeerReview}
                      />
                    } />
                    <Route path="shift-registration" element={
                      <StudyScheduleScreen
                        currentUser={currentUser}
                        studySchedules={studySchedules}
                        registrations={shiftRegistrations}
                        shifts={shifts}
                        capacityOverrides={capacityOverrides}
                        onSubmitStudySchedule={submitStudySchedule}
                        onSubmitRegistration={handleSubmitRegistration}
                        onUpdateRegistration={handleUpdateRegistration}
                      />
                    } />
                    <Route path="profile" element={
                      <ProfileScreen
                        currentUser={currentUser}
                        onUpdateUser={handleUpdateUser}
                        onLogout={handleLogout}
                        evidences={evidences}
                        onOpenAddEmployee={() => setShowAddEmployeeModal(true)}
                      />
                    } />
                  </Routes>
                </AuthenticatedLayout>
              )}
            </ProtectedRoute>
          }
        />

        {/* Manager routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute currentUser={currentUser} isLoggedIn={auth.isLoggedIn} requiredRole="manager">
              {currentUser && (
                <AuthenticatedLayout>
                  <Routes>
                    <Route path="dashboard" element={
                      <ManagerDashboard
                        currentUser={currentUser}
                        evidences={evidences}
                        allUsers={auth.users}
                        shifts={shifts}
                        onSelectEmployee={setSelectedEmployee}
                        onNavigateReview={() => goTo('review')}
                        onNavigateSchedule={() => goTo('manager_schedule')}
                      />
                    } />
                    <Route path="schedule/*" element={
                      <Routes>
                        <Route index element={
                          <ManagerScheduleTab
                            currentUser={currentUser}
                            allUsers={auth.users}
                            shifts={shifts}
                            onAddShift={handleAddShift}
                            onUpdateShift={handleUpdateShift}
                            onDeleteShift={handleDeleteShift}
                            onSwapShifts={handleSwapShifts}
                            registrations={shiftRegistrations}
                            onSubmitRegistration={handleSubmitRegistration}
                            onUpdateRegistration={handleUpdateRegistration}
                            onAddNotification={pushNotification}
                            studySchedules={studySchedules}
                            manualAssignments={manualAssignments}
                            onPublishSchedule={handlePublishSchedule}
                            onApplyBatchShifts={setShifts}
                            capacityOverrides={capacityOverrides}
                            onSetCapacity={setCapacityForDate}
                          />
                        } />
                        {/* "Xếp lịch học nhân viên" lives INSIDE the schedule tab
                            as a sub-tab. The sub-tab switcher in
                            ManagerScheduleTab handles the UI; this route keeps
                            the old URL /admin/study-schedules working. */}
                        <Route path="study" element={
                          <ManagerStudySchedulesScreen
                            currentUser={currentUser}
                            allUsers={auth.users}
                            studySchedules={studySchedules}
                            registrations={shiftRegistrations}
                            manualAssignments={manualAssignments}
                            shifts={shifts}
                            onPublishSchedule={handlePublishSchedule}
                            onAddNotification={pushNotification}
                            onApplyBatchShifts={setShifts}
                          />
                        } />
                      </Routes>
                    } />
                    <Route path="work-hours" element={
                      <WorkHoursScreen
                        currentUser={currentUser}
                        allUsers={auth.users}
                        getWorkHoursSummary={getWorkHoursSummary}
                        checkInOutRecords={checkInOutRecords}
                      />
                    } />
                    {/* Legacy URL: the study-schedules screen moved under the
                        schedule tab. Redirect keeps old links/bookmarks alive. */}
                    <Route path="study-schedules" element={
                      <Navigate to={ROUTES.MANAGER_SCHEDULE + '/study'} replace />
                    } />
                    <Route path="export" element={
                      <ExportReportScreen
                        currentUser={currentUser}
                        allUsers={auth.users}
                        shifts={shifts}
                        peerReviews={peerReviews}
                        shiftRegistrations={shiftRegistrations}
                      />
                    } />
                    <Route path="handover" element={
                      <ReviewScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        notifications={notifications.filter(n => n.category !== 'handover')}
                        onMarkNotificationRead={markRead}
                        onSubmitEvidence={handleSubmitEvidence}
                        postReactions={postReactions}
                        postComments={postComments}
                        onTogglePostReaction={toggleReaction}
                        onAddPostComment={addComment}
                        onDeletePostComment={deleteComment}
                      />
                    } />
                    {/* Manager-only: approval queue for feed posts — SEPARATE
                        route from the social feed. Posts land here as
                        'pending'; the feed itself stays a social space. */}
                    <Route path="approvals" element={
                      <ApprovalsScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        onEvaluate={handleReviewEvidence}
                        onOpenDetail={setSelectedEvidence}
                      />
                    } />
                    <Route path="peer-review" element={
                      <PeerReviewScreen
                        currentUser={currentUser}
                        allUsers={auth.users}
                        peerReviews={peerReviews}
                        onSubmitReview={submitPeerReview}
                      />
                    } />
                    <Route path="profile" element={
                      <ProfileScreen
                        currentUser={currentUser}
                        onUpdateUser={handleUpdateUser}
                        onLogout={handleLogout}
                        evidences={evidences}
                        onOpenAddEmployee={() => setShowAddEmployeeModal(true)}
                      />
                    } />
                    <Route path="*" element={<Navigate to={ROUTES.MANAGER_DASHBOARD} replace />} />
                  </Routes>
                </AuthenticatedLayout>
              )}
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Modals (global, outside routes) */}
      {currentUser && (
        <>
          <EvidenceDetailModal
            evidence={selectedEvidence}
            currentUser={currentUser}
            onClose={() => setSelectedEvidence(null)}
            onQuickEvaluate={handleReviewEvidence}
          />
          <EmployeeDetailModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
          {currentUser.role === 'manager' && (
            <AddEmployeeModal
              isOpen={showAddEmployeeModal}
              onClose={() => setShowAddEmployeeModal(false)}
              onAddEmployee={handleAddEmployee}
              existingUsers={auth.users}
            />
          )}
        </>
      )}

      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
