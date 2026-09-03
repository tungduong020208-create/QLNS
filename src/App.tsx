/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, EvidenceItem, NotificationItem, ActiveTab, CheckInRecord, CustomerRating, ApprovalRequest, QRReview, PeerReviewSubmission } from './types';
import { INITIAL_USERS, INITIAL_EVIDENCES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMER_RATINGS, INITIAL_APPROVAL_REQUESTS, INITIAL_QR_REVIEWS } from './data/initialData';
import { INITIAL_PEER_REVIEWS } from './data/peerReviewData';
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
import { ApprovalScreen } from './components/screens/ApprovalScreen';
import { QRReviewScreen } from './components/screens/QRReviewScreen';
import { PeerReviewScreen } from './components/screens/PeerReviewScreen';
import { ManagerScheduleScreen, Shift } from './components/screens/ManagerScheduleScreen';
import { AddEmployeeModal } from './components/modals/AddEmployeeModal';

export default function App() {
  // Users state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('enterprise_hr_current_user_id');
    const found = INITIAL_USERS.find(u => u.id === savedId);
    return found || INITIAL_USERS[0]; // Nguyễn Văn An
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('enterprise_hr_auth');
    return savedAuth !== null ? JSON.parse(savedAuth) : true;
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Evidences state
  const [evidences, setEvidences] = useState<EvidenceItem[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_evidences');
    return saved ? JSON.parse(saved) : INITIAL_EVIDENCES;
  });
  // Customer QR Ratings
  const [customerRatings] = useState<CustomerRating[]>(() => {
    const saved = localStorage.getItem('customerRatings');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_RATINGS;
  });


  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('enterprise_hr_notifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old notifications without category field
      return parsed.map((n: any) => ({
        ...n,
        category: n.category || (n.type === 'reward' || n.type === 'penalty' ? 'management' : 'handover')
      }));
    }
    return INITIAL_NOTIFICATIONS;
  });

  // Modal & toast states
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Approval requests state
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(() => {
    const saved = localStorage.getItem('coffeehouse_approvals');
    return saved ? JSON.parse(saved) : INITIAL_APPROVAL_REQUESTS;
  });

  // QR Reviews state
  const [qrReviews, setQrReviews] = useState<QRReview[]>(() => {
    const saved = localStorage.getItem('coffeehouse_qr_reviews');
    return saved ? JSON.parse(saved) : INITIAL_QR_REVIEWS;
  });

  // Peer Reviews state
  const [peerReviews, setPeerReviews] = useState<PeerReviewSubmission[]>(() => {
    const saved = localStorage.getItem('coffeehouse_peer_reviews');
    return saved ? JSON.parse(saved) : INITIAL_PEER_REVIEWS;
  });

  // Shifts state for manager schedule management
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem('coffeehouse_shifts');
    if (saved) return JSON.parse(saved);
    // Generate default shifts for current week
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
        // Morning shift for all
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
        // Afternoon shift for some
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

  // Check-in state
  const [checkInRecord, setCheckInRecord] = useState<CheckInRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('enterprise_hr_evidences', JSON.stringify(evidences));
  }, [evidences]);

  useEffect(() => {
    localStorage.setItem('enterprise_hr_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('enterprise_hr_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('coffeehouse_approvals', JSON.stringify(approvalRequests));
  }, [approvalRequests]);

  useEffect(() => {
    localStorage.setItem('coffeehouse_qr_reviews', JSON.stringify(qrReviews));
  }, [qrReviews]);

  useEffect(() => {
    localStorage.setItem('coffeehouse_peer_reviews', JSON.stringify(peerReviews));
  }, [peerReviews]);

  useEffect(() => {
    localStorage.setItem('coffeehouse_shifts', JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('enterprise_hr_current_user_id', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('enterprise_hr_auth', JSON.stringify(isLoggedIn));
  }, [isLoggedIn]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    addToast('success', 'Đăng nhập thành công', `Chào mừng ${user.name} trở lại hệ thống`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    addToast('info', 'Đã đăng xuất', 'Phiên làm việc đã kết thúc an toàn');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    addToast('info', 'Đã chuyển tài khoản', `Đang xem với tư cách: ${user.name} (${user.role === 'manager' ? 'Quản lý' : 'Nhân viên'})`);
  };

  const handleAddEmployee = (newEmployee: User, tempPassword: string) => {
    setUsers(prev => [...prev, newEmployee]);
    addToast('success', 'Tạo tài khoản thành công', `Tài khoản ${newEmployee.name} (${newEmployee.employeeCode}) đã được tạo`);
    setShowAddEmployeeModal(false);
  };

  const handlePasswordChanged = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, password: newPassword, mustChangePassword: false }
        : u
    ));
    // Also update current user if it's the same
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, password: newPassword, mustChangePassword: false }));
    }
  };

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    addToast('success', 'Đã lưu thông tin', 'Hồ sơ cá nhân đã được cập nhật thành công');
  };

  const handleSubmitEvidence = (newEvidence: EvidenceItem) => {
    setEvidences(prev => [newEvidence, ...prev]);
    
    // Add notification to notifications list
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Đã gửi minh chứng',
      message: `Minh chứng "${newEvidence.title}" đã được chuyển đến cấp quản lý duyệt.`,
      time: 'Vừa xong',
      read: false,
      type: 'pending',
      category: 'handover'
    };
    setNotifications(prev => [newNotif, ...prev]);

    addToast('success', 'Nộp minh chứng thành công', 'Minh chứng đã được gửi đến bộ phận quản lý');
    setActiveTab('home');
  };

  
  const handleReactEvidence = (evidenceId: string, reactionType: 'good' | 'bad') => {
    setEvidences(prev =>
      prev.map(item => {
        if (item.id !== evidenceId) return item;
        const existingReaction = (item.reactions || []).find(r => r.userId === currentUser.id);
        if (existingReaction) {
          if (existingReaction.type === reactionType) {
            return { ...item, reactions: (item.reactions || []).filter(r => r.userId !== currentUser.id) };
          }
          return { ...item, reactions: (item.reactions || []).map(r => r.userId === currentUser.id ? { ...r, type: reactionType } : r) };
        }
        return { ...item, reactions: [...(item.reactions || []), { userId: currentUser.id, type: reactionType }] };
      })
    );
  };

  const handleReviewEvidence = (
    evidenceId: string,
    status: 'good' | 'bad',
    points: number,
    note: string
  ) => {
    const target = evidences.find(e => e.id === evidenceId);
    const now = new Date();
    const reviewTime = `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    setEvidences(prev =>
      prev.map(item =>
        item.id === evidenceId
          ? {
              ...item,
              status,
              points,
              managerNote: note,
              reviewedAt: reviewTime,
              reviewedBy: currentUser.name
            }
          : item
      )
    );

    // Create notification for employee
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

    addToast(
      status === 'good' ? 'success' : 'error',
      status === 'good' ? 'Đã duyệt TỐT' : 'Đã đánh giá CHƯA TỐT',
      `Đã cập nhật ${status === 'good' ? `+${points}` : `${points}`} điểm cho nhân viên`
    );
  };

  const handleApproveRequest = (id: string, note: string) => {
    setApprovalRequests(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: 'approved' as const, managerNote: note, reviewedAt: new Date().toLocaleString('vi-VN'), reviewedBy: currentUser.name }
          : r
      )
    );
    addToast('success', 'Đã duyệt yêu cầu', 'Yêu cầu đã được phê duyệt thành công');
  };

  const handleRejectRequest = (id: string, note: string) => {
    setApprovalRequests(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: 'rejected' as const, managerNote: note, reviewedAt: new Date().toLocaleString('vi-VN'), reviewedBy: currentUser.name }
          : r
      )
    );
    addToast('error', 'Đã từ chối', 'Yêu cầu đã bị từ chối');
  };

  const handleAddQRReview = (review: QRReview) => {
    setQrReviews(prev => [review, ...prev]);
    addToast(
      'success',
      'Đã ghi nhận đánh giá',
      review.sentToGoogle
        ? 'Đánh giá 5 sao sẽ được gửi lên Google Reviews'
        : 'Đánh giá đã lưu để xử lý nội bộ'
    );
  };

  const handleSubmitPeerReview = (submission: PeerReviewSubmission) => {
    setPeerReviews(prev => [submission, ...prev]);
    addToast('success', 'Đã gửi đánh giá chéo', 'Đánh giá của bạn đã được ghi nhận thành công');
  };

  // Shift management handlers
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

  const handleSwapShifts = (shift1Id: string, shift2Id: string) => {
    setShifts(prev => {
      const shift1 = prev.find(s => s.id === shift1Id);
      const shift2 = prev.find(s => s.id === shift2Id);
      if (!shift1 || !shift2) return prev;
      return prev.map(s => {
        if (s.id === shift1Id) {
          return { ...s, employeeId: shift2.employeeId, employeeName: shift2.employeeName, employeeAvatar: shift2.employeeAvatar, swappedWith: shift2.employeeId };
        }
        if (s.id === shift2Id) {
          return { ...s, employeeId: shift1.employeeId, employeeName: shift1.employeeName, employeeAvatar: shift1.employeeAvatar, swappedWith: shift1.employeeId };
        }
        return s;
      });
    });
    addToast('success', 'Đã đổi ca', 'Ca làm việc đã được đổi thành công');
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('info', 'Đã đọc thông báo', 'Tất cả thông báo đã được đánh dấu đã đọc');
  };

  const pendingReviewCount = evidences.filter(e => e.status === 'pending').length;

  // If not logged in, render Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FDF8EE]">
        <LoginScreen onLogin={handleLogin} allUsers={users} onPasswordChanged={handlePasswordChanged} />
        <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8EE] text-[#3D4663] flex flex-col md:flex-row">
      {/* TopAppBar */}
      <Header
        currentUser={currentUser}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearAllNotifications={handleClearAllNotifications}
        onSwitchUser={handleSwitchUser}
        allUsers={users}
        onNavigateToProfile={() => setActiveTab('profile')}
        onLogout={handleLogout}
      />

      {/* Desktop Sidebar (visible on md: and above) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentUser={currentUser}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Main Screen Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {activeTab === 'home' && currentUser.role === 'manager' && (
          <ManagerDashboard
            currentUser={currentUser}
            evidences={evidences}
            allUsers={users}
            onSelectEvidence={(evidence) => setSelectedEvidence(evidence)}
            onSelectEmployee={(employee) => setSelectedEmployee(employee)}
            onNavigateReview={() => setActiveTab('review')}
          />
        )}

        {activeTab === 'home' && currentUser.role === 'employee' && (
          <HomeScreen
            currentUser={currentUser}
            evidences={evidences}
            customerRatings={customerRatings}
            onNavigateSubmit={() => setActiveTab('submit')}
            onSelectEvidence={(evidence) => setSelectedEvidence(evidence)}
            onNavigateReview={() => setActiveTab('review')}
            checkInRecord={checkInRecord}
            onCheckIn={(record) => {
              setCheckInRecord(record);
              addToast('success', 'Điểm danh thành công', `${record.type === 'checkin' ? 'Check-in' : 'Check-out'} lúc ${record.time} đã được ghi nhận`);
            }}
          />
        )}

        {activeTab === 'approval' && currentUser.role === 'manager' && (
          <ApprovalScreen
            currentUser={currentUser}
            requests={approvalRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        )}

        {activeTab === 'review' && (
          <ReviewScreen
            currentUser={currentUser}
            evidences={evidences}
            notifications={notifications}
            onReactEvidence={handleReactEvidence}
            onMarkNotificationRead={handleMarkNotificationRead}
            onSubmitEvidence={handleSubmitEvidence}
          />
        )}

        {activeTab === 'manager_schedule' && currentUser.role === 'manager' && (
          <ManagerScheduleScreen
            currentUser={currentUser}
            allUsers={users}
            shifts={shifts}
            onAddShift={handleAddShift}
            onUpdateShift={handleUpdateShift}
            onDeleteShift={handleDeleteShift}
            onSwapShifts={handleSwapShifts}
            onAddNotification={(notif) => setNotifications(prev => [notif, ...prev])}
          />
        )}

        {activeTab === 'peer_review' && (
          <PeerReviewScreen
            currentUser={currentUser}
            allUsers={users}
            peerReviews={peerReviews}
            onSubmitReview={handleSubmitPeerReview}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            evidences={evidences}
            onOpenAddEmployee={() => setShowAddEmployeeModal(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        pendingReviewCount={pendingReviewCount}
        currentUser={currentUser}
      />

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        evidence={selectedEvidence}
        currentUser={currentUser}
        onClose={() => setSelectedEvidence(null)}
        onQuickEvaluate={handleReviewEvidence}
      />

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        evidences={evidences}
        onClose={() => setSelectedEmployee(null)}
        onNavigateToReview={() => setActiveTab('review')}
      />

      {/* Add Employee Modal (Manager only) */}
      {currentUser.role === 'manager' && (
        <AddEmployeeModal
          isOpen={showAddEmployeeModal}
          onClose={() => setShowAddEmployeeModal(false)}
          onAddEmployee={handleAddEmployee}
          existingUsers={users}
        />
      )}

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
