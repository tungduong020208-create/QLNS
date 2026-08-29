import React, { useState, useEffect } from 'react';
import { User, EvidenceItem, CheckInRecord } from '../types';

interface ManagerDashboardProps {
  currentUser: User;
  evidences: EvidenceItem[];
  allUsers: User[];
  onSelectEvidence: (evidence: EvidenceItem) => void;
  onSelectEmployee: (user: User) => void;
  onNavigateReview: () => void;
}

interface EmployeeCheckInStatus {
  user: User;
  checkInRecord: CheckInRecord | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  pendingEvidenceCount: number;
  totalEvidenceCount: number;
  avgScore: number;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currentUser,
  evidences,
  allUsers,
  onSelectEvidence,
  onSelectEmployee,
  onNavigateReview
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeCheckInStatus[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const employees = allUsers.filter(u => u.role === 'employee');
    const statuses: EmployeeCheckInStatus[] = employees.map(emp => {
      const empEvidences = evidences.filter(e => e.employeeId === emp.id);
      const pendingCount = empEvidences.filter(e => e.status === 'pending').length;
      const goodCount = empEvidences.filter(e => e.status === 'good').length;
      const badCount = empEvidences.filter(e => e.status === 'bad').length;
      const avgScore = empEvidences.length > 0 
        ? empEvidences.reduce((acc, e) => acc + e.points, 0) / empEvidences.length 
        : 0;

      // Simulate check-in status (in real app, this would come from API)
      const hasCheckedIn = Math.random() > 0.3;
      const hasCheckedOut = hasCheckedIn ? Math.random() > 0.5 : false;

      return {
        user: emp,
        checkInRecord: null,
        hasCheckedIn,
        hasCheckedOut,
        pendingEvidenceCount: pendingCount,
        totalEvidenceCount: empEvidences.length,
        avgScore
      };
    });
    setEmployeeStatuses(statuses);
  }, [allUsers, evidences]);

  const totalEmployees = allUsers.filter(u => u.role === 'employee').length;
  const checkedInCount = employeeStatuses.filter(s => s.hasCheckedIn).length;
  const checkedOutCount = employeeStatuses.filter(s => s.hasCheckedOut).length;
  const pendingReviewCount = evidences.filter(e => e.status === 'pending').length;
  const totalPoints = evidences.reduce((acc, e) => acc + e.points, 0);
  const avgTeamScore = totalEmployees > 0 ? Math.round(totalPoints / totalEmployees) : 0;

  const recentEvidences = [...evidences]
    .sort((a, b) => new Date(b.dateString).getTime() - new Date(a.dateString).getTime())
    .slice(0, 5);

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
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1b1b21] tracking-tight">
          Xin chào, {currentUser.name}
        </h1>
        <p className="text-sm text-[#454652] mt-1">
          Quản lý tổng quan và theo dõi hiệu suất nhân viên
        </p>
      </div>

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
                <div className="text-xs text-[#767683]">{status.user.department}</div>
              </div>
              <div className="flex items-center gap-2">
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
              {false && status.pendingEvidenceCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline font-bold text-[#1b1b21] text-base">Minh chứng gần đây</h3>
            <p className="text-xs text-[#767683] mt-0.5">Các minh chứng mới nhất từ nhân viên</p>
          </div>
          <button onClick={onNavigateReview} className="text-xs text-[#000666] font-medium hover:underline">Xem bàn giao ca →</button>
        </div>
        <div className="space-y-3">
          {recentEvidences.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-[#f9f8fc] rounded-xl hover:bg-[#f0eef5] transition-colors cursor-pointer" onClick={() => onSelectEvidence(item)}>
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#c6c5d4] flex-shrink-0">
                <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.title} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#1b1b21] truncate">{item.title}</div>
                <div className="flex items-center gap-2 text-xs text-[#767683]">
                  <span>{item.employeeName}</span><span>•</span><span>{item.timestamp}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {item.status === 'good' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">thumb_up</span>Tốt
                  </span>
                ) : item.status === 'bad' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">thumb_down</span>Chưa tốt
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[14px]">pending</span>Chờ duyệt
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
