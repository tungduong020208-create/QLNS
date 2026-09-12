/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, EvidenceItem, NotificationItem, CheckInRecord, CustomerRating, QRReview, PeerReviewSubmission, WeeklyShiftRegistration, CheckInOutRecord, WorkHoursSummary, StudySchedule, ManualShiftAssignment } from './types';
import { INITIAL_USERS, INITIAL_EVIDENCES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMER_RATINGS, INITIAL_QR_REVIEWS } from './data/initialData';
import { INITIAL_PEER_REVIEWS } from './data/peerReviewData';
import { ROUTES, getDefaultHomeRoute } from './routes';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/screens/LoginScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { SubmitEvidenceScreen } from './components/screens/SubmitEvidenceScreen';
import { ReviewScreen } from './components/screens/ReviewScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { EvidenceDetailModal } from './components/modals/EvidenceDetailModal';
import { ToastNotification, ToastMessage } from './components/modals/ToastNotification';
import { ManagerDashboard } from './components/ManagerDashboard';
import { EmployeeDetailModal } from './components/modals/EmployeeDetailModal';
import { WorkHoursScreen } from './components/screens/WorkHoursScreen';
import { StudyScheduleScreen } from './components/screens/StudyScheduleScreen';
import { ManagerStudySchedulesScreen } from './components/screens/ManagerStudySchedulesScreen';
import { PeerReviewScreen } from './components/screens/PeerReviewScreen';
import { ManagerScheduleScreen, Shift } from './components/screens/ManagerScheduleScreen';
import { ManagerScheduleTab } from './components/screens/ManagerScheduleTab';
import { ExportReportScreen } from './components/screens/ExportReportScreen';
import { ShiftRegistrationScreen } from './components/screens/ShiftRegistrationScreen';
import { AddEmployeeModal } from './components/modals/AddEmployeeModal';
import { useGeofenceMonitor } from './hooks/useGeofenceMonitor';
import { GeofenceEvent } from './types';

export default function App() {
  const navigate = useNavigate();

  // ─── Core Auth State ───
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedId = localStorage.getItem('enterprise_hr_current_user_id');
    if (savedId) {
      const found = users.find(u => u.id === savedId);
      if (found) return found;
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('enterprise_hr_auth') === 'true';
  });

  // ─── Data State ───
  const [evidences, setEvidences] = useState<EvidenceItem[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_evidences');
    return saved ? JSON.parse(saved) : INITIAL_EVIDENCES;
  });

  const [customerRatings] = useState<CustomerRating[]>(() => {
    const saved = localStorage.getItem('customerRatings');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_RATINGS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_notifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((n: any) => ({
        ...n,
        category: n.category || (n.type === 'reward' || n.type === 'penalty' ? 'management' : 'handover')
      }));
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [qrReviews, setQrReviews] = useState<QRReview[]>(() => {
    const saved = localStorage.getItem('coffeehouse_qr_reviews');
    return saved ? JSON.parse(saved) : INITIAL_QR_REVIEWS;
  });

  const [peerReviews, setPeerReviews] = useState<PeerReviewSubmission[]>(() => {
    const saved = localStorage.getItem('coffeehouse_peer_reviews');
    return saved ? JSON.parse(saved) : INITIAL_PEER_REVIEWS;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem('coffeehouse_shifts');
    if (saved) return JSON.parse(saved);
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    const defaultShifts: Shift[] = [];
    const employees = INITIAL_USERS.filter(u => u.role !== 'manager');
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      employees.forEach((emp, idx) => {
        defaultShifts.push({
          id: `shift-default-m-${dateStr}-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          date: dateStr,
          shiftName: 'Ca sáng',
          startTime: '07:00',
          endTime: '12:00',
          status: i < 3 ? 'completed' : 'scheduled',
        });
        if (idx % 2 === 0) {
          defaultShifts.push({
            id: `shift-default-a-${dateStr}-${emp.id}`,
            employeeId: emp.id,
            employeeName: emp.name,
            employeeAvatar: emp.avatar,
            date: dateStr,
            shiftName: 'Ca chiều',
            startTime: '13:00',
            endTime: '18:00',
            status: i < 3 ? 'completed' : 'scheduled',
          });
        }
      });
    }
    return defaultShifts;
  });

  // ─── Shift Registrations (Weekly Schedule) ───
  const [shiftRegistrations, setShiftRegistrations] = useState<WeeklyShiftRegistration[]>(() => {
    const saved = localStorage.getItem('aiicafe_shift_registrations');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── Study Schedules ───
  const [studySchedules, setStudySchedules] = useState<StudySchedule[]>(() => {
    const saved = localStorage.getItem('aiicafe_study_schedules');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── Manual Shift Assignments ───
  const [manualAssignments, setManualAssignments] = useState<ManualShiftAssignment[]>(() => {
    const saved = localStorage.getItem('aiicafe_manual_assignments');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── UI State ───
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // ─── Check-in state (persists across routes) ───
  const [checkInRecord, setCheckInRecord] = useState<CheckInRecord | null>(null);

  // ─── Persist to localStorage ───
  useEffect(() => { localStorage.setItem('enterprise_hr_evidences', JSON.stringify(evidences)); }, [evidences]);
  useEffect(() => { localStorage.setItem('enterprise_hr_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('enterprise_hr_users', JSON.stringify(users)); }, [users]);

  useEffect(() => { localStorage.setItem('coffeehouse_qr_reviews', JSON.stringify(qrReviews)); }, [qrReviews]);
  useEffect(() => { localStorage.setItem('coffeehouse_peer_reviews', JSON.stringify(peerReviews)); }, [peerReviews]);
  useEffect(() => { localStorage.setItem('coffeehouse_shifts', JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem('aiicafe_shift_registrations', JSON.stringify(shiftRegistrations)); }, [shiftRegistrations]);
  useEffect(() => { localStorage.setItem('aiicafe_study_schedules', JSON.stringify(studySchedules)); }, [studySchedules]);
  useEffect(() => { localStorage.setItem('aiicafe_manual_assignments', JSON.stringify(manualAssignments)); }, [manualAssignments]);
  useEffect(() => { localStorage.setItem('enterprise_hr_auth', JSON.stringify(isLoggedIn)); }, [isLoggedIn]);

  // Persist current user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('enterprise_hr_current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('enterprise_hr_current_user_id');
    }
  }, [currentUser]);

  // ─── Toast helpers ───
  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ─── Auth handlers ───
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    addToast('success', 'Đăng nhập thành công', `Chào mừng ${user.name} trở lại hệ thống`);
    navigate(getDefaultHomeRoute(user.role), { replace: true });
  };

  const handleLogout = () => {
    // Clear session/auth data from localStorage (keep persistent data like notifications, evidences)
    localStorage.removeItem('enterprise_hr_current_user_id');
    localStorage.removeItem('enterprise_hr_auth');
    setIsLoggedIn(false);
    setCurrentUser(null);
    addToast('info', 'Đã đăng xuất', 'Phiên làm việc đã kết thúc an toàn');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  // ─── User management ───
  const handleAddEmployee = (newEmployee: User) => {
    setUsers(prev => [...prev, newEmployee]);
    addToast('success', 'Tạo tài khoản thành công', `Tài khoản ${newEmployee.name} (${newEmployee.employeeCode}) đã được tạo`);
    setShowAddEmployeeModal(false);
  };

  const handlePasswordChanged = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, password: newPassword, mustChangePassword: false } : u
    ));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, password: newPassword, mustChangePassword: false } : null);
    }
  };

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    addToast('success', 'Đã lưu thông tin', 'Hồ sơ cá nhân đã được cập nhật thành công');
  };

  // ─── Evidence handlers ───
  const handleSubmitEvidence = (newEvidence: EvidenceItem) => {
    setEvidences(prev => [newEvidence, ...prev]);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Đã gửi minh chứng',
      message: `Minh chứng "${newEvidence.title}" đã được chuyển đến cấp quản lý duyệt.`,
      time: 'Vừa xong',
      read: false,
      type: 'pending',
      category: 'management'
    };
    setNotifications(prev => [newNotif, ...prev]);
    addToast('success', 'Nộp minh chứng thành công', 'Minh chứng đã được gửi đến bộ phận quản lý');
    navigate(currentUser?.role === 'manager' ? ROUTES.MANAGER_DASHBOARD : ROUTES.EMPLOYEE_HOME, { replace: true });
  };

  const handleReactEvidence = (evidenceId: string, reactionType: 'good' | 'bad') => {
    if (!currentUser) return;
    setEvidences(prev =>
      prev.map(item => {
        if (item.id !== evidenceId) return item;
        const existing = (item.reactions || []).find(r => r.userId === currentUser.id);
        if (existing) {
          if (existing.type === reactionType) {
            return { ...item, reactions: (item.reactions || []).filter(r => r.userId !== currentUser.id) };
          }
          return { ...item, reactions: (item.reactions || []).map(r => r.userId === currentUser.id ? { ...r, type: reactionType } : r) };
        }
        return { ...item, reactions: [...(item.reactions || []), { userId: currentUser.id, type: reactionType }] };
      })
    );
  };

  const handleReviewEvidence = (evidenceId: string, status: 'good' | 'bad', points: number, note: string) => {
    if (!currentUser) return;
    const target = evidences.find(e => e.id === evidenceId);
    const now = new Date();
    const reviewTime = `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    setEvidences(prev =>
      prev.map(item =>
        item.id === evidenceId ? { ...item, status, points, managerNote: note, reviewedAt: reviewTime, reviewedBy: currentUser.name } : item
      )
    );
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
      setNotifications(prev => [notifItem, ...prev]);
    }
    addToast(status === 'good' ? 'success' : 'error', status === 'good' ? 'Đã duyệt TỐT' : 'Đã đánh giá CHƯA TỐT', `Đã cập nhật ${status === 'good' ? `+${points}` : `${points}`} điểm cho nhân viên`);
  };

  // ─── Work Hours Tracking ───
  const [checkInOutRecords, setCheckInOutRecords] = useState<CheckInOutRecord[]>(() => {
    const saved = localStorage.getItem('aiicafe_checkinout_records');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('aiicafe_checkinout_records', JSON.stringify(checkInOutRecords)); }, [checkInOutRecords]);

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
    setNotifications(prev => [notifItem, ...prev]);
  };

  useGeofenceMonitor(currentUser, handleGeofenceOutOfRange);

  // Handle check-in
  const handleCheckIn = (record: CheckInRecord) => {
    setCheckInRecord(record);
    const todayStr = new Date().toISOString().split('T')[0];
    const newCheckIn: CheckInOutRecord = {
      id: `ci-${Date.now()}`,
      userId: currentUser?.id || '',
      date: todayStr,
      checkInTime: new Date().toISOString(),
    };
    setCheckInOutRecords(prev => [...prev, newCheckIn]);
    addToast('success', 'Điểm danh thành công', `Check-in lúc ${record.time} đã được ghi nhận`);
  };

  // Handle check-out
  const handleCheckOut = (record: CheckInRecord) => {
    setCheckInRecord(record);
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    setCheckInOutRecords(prev => {
      // Find the most recent check-in for today without checkout
      const lastCheckInIndex = prev.findLastIndex(
        r => r.userId === currentUser?.id && r.date === todayStr && !r.checkOutTime
      );
      
      if (lastCheckInIndex === -1) return prev;
      
      const updated = [...prev];
      const checkInTime = new Date(updated[lastCheckInIndex].checkInTime);
      const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      updated[lastCheckInIndex] = {
        ...updated[lastCheckInIndex],
        checkOutTime: now.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
      };
      return updated;
    });
    addToast('success', 'Điểm danh thành công', `Check-out lúc ${record.time} đã được ghi nhận`);
  };

  // Calculate work hours summary for a given month
  const getWorkHoursSummary = (yearMonth: string): WorkHoursSummary[] => {
    const employees = users.filter(u => u.role !== 'manager');
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

  // ─── Peer review ───
  const handleSubmitPeerReview = (submission: PeerReviewSubmission) => {
    setPeerReviews(prev => [submission, ...prev]);
    // Toast handled by PeerReviewScreen itself
  };

  // ─── Shift management ───
  const handleAddShift = (shift: Shift) => {
    setShifts(prev => [...prev, shift]);
    addToast('success', 'Đã thêm ca mới', `Ca ${shift.shiftName} cho ${shift.employeeName}`);
  };

  const handleUpdateShift = (updatedShift: Shift) => {
    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
    addToast('success', 'Đã cập nhật ca', `Ca ${updatedShift.shiftName} đã được chỉnh sửa`);
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    addToast('info', 'Đã xóa ca', 'Ca làm việc đã bị xóa');
  };

  // ─── Shift Registration Handlers ───
  const handleSubmitRegistration = (reg: WeeklyShiftRegistration) => {
    setShiftRegistrations(prev => [...prev, reg]);
    addToast('success', 'Đăng ký thành công', `Đã gửi lịch tuần ${reg.weekNumber} cho quản lý duyệt`);
  };

  const handleUpdateRegistration = (reg: WeeklyShiftRegistration) => {
    setShiftRegistrations(prev => prev.map(r => r.id === reg.id ? reg : r));
    addToast('success', 'Đã cập nhật', 'Lịch làm việc đã được cập nhật');
  };

  // ─── Study Schedule Handlers ───
  const handleSubmitStudySchedule = (schedule: StudySchedule) => {
    setStudySchedules(prev => {
      const existing = prev.find(s => s.userId === schedule.userId && s.weekStart === schedule.weekStart);
      if (existing) {
        return prev.map(s => s.id === existing.id ? schedule : s);
      }
      return [...prev, schedule];
    });
  };

  // ─── Manual Assignment Handlers ───
  const handlePublishSchedule = (assignment: ManualShiftAssignment) => {
    setManualAssignments(prev => {
      const existing = prev.find(a => a.userId === assignment.userId && a.weekStart === assignment.weekStart);
      if (existing) {
        return prev.map(a => a.id === existing.id ? assignment : a);
      }
      return [...prev, assignment];
    });
    addToast('success', 'Đã xuất bản lịch', `Lịch làm việc đã được cập nhật cho ${assignment.userName}`);
  };

  // ─── Notifications ───
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearAllNotifications = () => {
    // Silently mark all notifications as read (no toast — the badge disappearing is the feedback)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const pendingReviewCount = evidences.filter(e => e.status === 'pending').length;

  // ─── Navigation helper (passed to child components) ───
  const goTo = (tab: string) => {
    if (!currentUser) return;
    const role = currentUser.role;
    const routeMap: Record<string, Record<string, string>> = {
      manager: {
        home: ROUTES.MANAGER_DASHBOARD,
        manager_schedule: ROUTES.MANAGER_SCHEDULE,
        work_hours: ROUTES.MANAGER_WORK_HOURS,
        study_schedules: ROUTES.MANAGER_STUDY_SCHEDULES,
        review: ROUTES.MANAGER_HANDOVER,
        peer_review: ROUTES.MANAGER_PEER_REVIEW,
        export_report: ROUTES.MANAGER_EXPORT,
        profile: ROUTES.MANAGER_PROFILE,
      },
      employee: {
        home: ROUTES.EMPLOYEE_HOME,
        review: ROUTES.EMPLOYEE_HANDOVER,
        peer_review: ROUTES.EMPLOYEE_PEER_REVIEW,
        study_schedule: ROUTES.EMPLOYEE_SHIFT_REGISTRATION,
        profile: ROUTES.EMPLOYEE_PROFILE,
      },
    };
    const route = routeMap[role]?.[tab];
    if (route) navigate(route);
  };

  // ─── Layout wrapper for authenticated pages ───
  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
    if (!currentUser) return null;
    return (
      <div className="min-h-screen bg-[#FDF8EE] text-[#3D4663] flex flex-col md:flex-row">
        <Header
          currentUser={currentUser}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onClearAllNotifications={handleClearAllNotifications}
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
  };

  return (
    <div className="min-h-screen bg-[#FDF8EE]">
      <Routes>
        {/* Public: Login page */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <GuestRoute currentUser={currentUser} isLoggedIn={isLoggedIn}>
              <LoginScreen onLogin={handleLogin} allUsers={users} onPasswordChanged={handlePasswordChanged} />
            </GuestRoute>
          }
        />

        {/* Root: Redirect based on role */}
        <Route
          path={ROUTES.HOME}
          element={
            <ProtectedRoute currentUser={currentUser} isLoggedIn={isLoggedIn}>
              {currentUser ? (
                <AuthenticatedLayout>
                  <Routes>
                    {currentUser.role === 'manager' ? (
                      <Route index element={
                        <ManagerDashboard
                          currentUser={currentUser}
                          evidences={evidences}
                          allUsers={users}
                          onSelectEvidence={(e) => setSelectedEvidence(e)}
                          onSelectEmployee={(e) => setSelectedEmployee(e)}
                          onNavigateReview={() => goTo('review')}
                        />
                      } />
                    ) : (
                      <Route index element={
                        <HomeScreen
                          currentUser={currentUser}
                          evidences={evidences}
                          customerRatings={customerRatings}
                          peerReviews={peerReviews}
                          onNavigateSubmit={() => navigate(currentUser.role === 'manager' ? ROUTES.MANAGER_DASHBOARD : ROUTES.EMPLOYEE_HOME)}
                          onSelectEvidence={(e) => setSelectedEvidence(e)}
                          onNavigateReview={() => goTo('review')}
                          checkInRecord={checkInRecord}
                          onCheckIn={(record) => {
                            if (record.type === 'checkin') {
                              handleCheckIn(record);
                            } else {
                              handleCheckOut(record);
                            }
                          }}
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
            <ProtectedRoute currentUser={currentUser} isLoggedIn={isLoggedIn} requiredRole="employee">
              {currentUser && (
                <AuthenticatedLayout>
                  <Routes>
                    <Route path="home" element={
                      <HomeScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        customerRatings={customerRatings}
                        peerReviews={peerReviews}
                        onNavigateSubmit={() => {}}
                        onSelectEvidence={(e) => setSelectedEvidence(e)}
                        onNavigateReview={() => goTo('review')}
                        checkInRecord={checkInRecord}
                        onCheckIn={(record) => {
                          if (record.type === 'checkin') {
                            handleCheckIn(record);
                          } else {
                            handleCheckOut(record);
                          }
                        }}
                      />
                    } />

                                        <Route path="handover" element={
                      <ReviewScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        notifications={notifications}
                        onReactEvidence={handleReactEvidence}
                        onMarkNotificationRead={handleMarkNotificationRead}
                        onSubmitEvidence={handleSubmitEvidence}
                      />
                    } />
                    <Route path="peer-review" element={
                      <PeerReviewScreen
                        currentUser={currentUser}
                        allUsers={users}
                        peerReviews={peerReviews}
                        onSubmitReview={handleSubmitPeerReview}
                      />
                    } />
                    <Route path="shift-registration" element={
                      <StudyScheduleScreen
                        currentUser={currentUser}
                        studySchedules={studySchedules}
                        registrations={shiftRegistrations}
                        onSubmitStudySchedule={handleSubmitStudySchedule}
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
            <ProtectedRoute currentUser={currentUser} isLoggedIn={isLoggedIn} requiredRole="manager">
              {currentUser && (
                <AuthenticatedLayout>
                  <Routes>
                    <Route path="dashboard" element={
                      <ManagerDashboard
                        currentUser={currentUser}
                        evidences={evidences}
                        allUsers={users}
                        onSelectEvidence={(e) => setSelectedEvidence(e)}
                        onSelectEmployee={(e) => setSelectedEmployee(e)}
                        onNavigateReview={() => goTo('review')}
                      />
                    } />
                    <Route path="schedule" element={
                      <ManagerScheduleTab
                        currentUser={currentUser}
                        allUsers={users}
                        shifts={shifts}
                        onAddShift={handleAddShift}
                        onUpdateShift={handleUpdateShift}
                        onDeleteShift={handleDeleteShift}
                        registrations={shiftRegistrations}
                        onSubmitRegistration={handleSubmitRegistration}
                        onUpdateRegistration={handleUpdateRegistration}
                        onAddNotification={(notif) => setNotifications(prev => [notif, ...prev])}
                      />
                    } />
                    <Route path="work-hours" element={
                      <WorkHoursScreen
                        currentUser={currentUser}
                        allUsers={users}
                        getWorkHoursSummary={getWorkHoursSummary}
                        checkInOutRecords={checkInOutRecords}
                      />
                    } />
                    <Route path="study-schedules" element={
                      <ManagerStudySchedulesScreen
                        currentUser={currentUser}
                        allUsers={users}
                        studySchedules={studySchedules}
                        registrations={shiftRegistrations}
                        manualAssignments={manualAssignments}
                        onPublishSchedule={handlePublishSchedule}
                        onAddNotification={(notif) => setNotifications(prev => [notif, ...prev])}
                      />
                    } />

                    <Route path="export" element={
                      <ExportReportScreen
                        currentUser={currentUser}
                        allUsers={users}
                        shifts={shifts}
                        peerReviews={peerReviews}
                        shiftRegistrations={shiftRegistrations}
                      />
                    } />

                    <Route path="*" element={<Navigate to={ROUTES.MANAGER_DASHBOARD} replace />} />

                    <Route path="handover" element={
                      <ReviewScreen
                        currentUser={currentUser}
                        evidences={evidences}
                        notifications={notifications.filter(n => n.category !== 'handover')}
                        onReactEvidence={handleReactEvidence}
                        onMarkNotificationRead={handleMarkNotificationRead}
                        onSubmitEvidence={handleSubmitEvidence}
                      />
                    } />
                    <Route path="peer-review" element={
                      <PeerReviewScreen
                        currentUser={currentUser}
                        allUsers={users}
                        peerReviews={peerReviews}
                        onSubmitReview={handleSubmitPeerReview}
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
            evidences={evidences}
            onClose={() => setSelectedEmployee(null)}
            onNavigateToReview={() => goTo('review')}
          />
          {currentUser.role === 'manager' && (
            <AddEmployeeModal
              isOpen={showAddEmployeeModal}
              onClose={() => setShowAddEmployeeModal(false)}
              onAddEmployee={handleAddEmployee}
              existingUsers={users}
            />
          )}
        </>
      )}

      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
