/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, EvidenceItem, NotificationItem, ActiveTab, CheckInRecord, CustomerRating } from './types';
import { INITIAL_USERS, INITIAL_EVIDENCES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMER_RATINGS } from './data/initialData';
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
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Modal & toast states
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Check-in state
  const [checkInRecord, setCheckInRecord] = useState<CheckInRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

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
      type: 'pending'
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
        type: status === 'good' ? 'reward' : 'penalty'
      };
      setNotifications(prev => [notifItem, ...prev]);
    }

    addToast(
      status === 'good' ? 'success' : 'error',
      status === 'good' ? 'Đã duyệt TỐT' : 'Đã đánh giá CHƯA TỐT',
      `Đã cập nhật ${status === 'good' ? `+${points}` : `${points}`} điểm cho nhân viên`
    );
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
      <div className="min-h-screen bg-[#fbf8ff]">
        <LoginScreen onLogin={handleLogin} allUsers={users} />
        <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8ff] text-[#1b1b21] flex flex-col md:flex-row">
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

        {activeTab === 'submit' && (
          <SubmitEvidenceScreen
            currentUser={currentUser}
            onBack={() => setActiveTab('home')}
            onSubmit={handleSubmitEvidence}
          />
        )}

        {activeTab === 'review' && (
          <ReviewScreen
            currentUser={currentUser}
            evidences={evidences}
            onReactEvidence={handleReactEvidence}
            onReviewEvidence={handleReviewEvidence}
            onSelectEvidence={(evidence) => setSelectedEvidence(evidence)}
          />
        )}



        {activeTab === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            evidences={evidences}
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

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
