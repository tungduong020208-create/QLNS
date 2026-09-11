import React, { useState, useMemo } from 'react';
import { User, WorkHoursSummary, CheckInOutRecord } from '../../types';

interface WorkHoursScreenProps {
  currentUser: User;
  allUsers: User[];
  getWorkHoursSummary: (yearMonth: string) => WorkHoursSummary[];
  checkInOutRecords: CheckInOutRecord[];
}

const getMonthOptions = () => {
  const months: { value: string; label: string }[] = [];
  const today = new Date();
  
  // Add current month and 2 previous months
  for (let i = 0; i < 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  
  return months;
};

export const WorkHoursScreen: React.FC<WorkHoursScreenProps> = ({
  currentUser,
  allUsers,
  getWorkHoursSummary,
  checkInOutRecords,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const workHoursSummary = useMemo(() => {
    return getWorkHoursSummary(selectedMonth);
  }, [selectedMonth, getWorkHoursSummary]);

  const selectedEmployeeSummary = useMemo(() => {
    if (!selectedEmployee) return null;
    return workHoursSummary.find(s => s.userId === selectedEmployee) || null;
  }, [selectedEmployee, workHoursSummary]);

  // Sort by total hours descending
  const sortedSummary = useMemo(() => {
    return [...workHoursSummary].sort((a, b) => b.totalHours - a.totalHours);
  }, [workHoursSummary]);

  const totalHoursAll = useMemo(() => {
    return workHoursSummary.reduce((sum, s) => sum + s.totalHours, 0);
  }, [workHoursSummary]);

  const employees = allUsers.filter(u => u.role !== 'manager');

  return (
    <div className="pb-28 pt-20 px-4 max-w-4xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-[#0F1E44] mb-1">
          Theo dõi giờ làm việc
        </h1>
        <p className="text-sm text-[#7A829A]">
          Tổng hợp giờ làm thực tế của nhân viên theo tháng
        </p>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#EFC14B] text-xl">calendar_month</span>
          <h3 className="text-sm font-bold text-[#0F1E44]">Chọn tháng</h3>
        </div>
        <div className="flex gap-2">
          {monthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedMonth(option.value)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                selectedMonth === option.value
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'bg-[#FDF8EE] text-[#3D4663] hover:bg-[#EFC14B]/20 border border-[#E8DFD0]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#0F1E44]">
            {sortedSummary.length}
          </p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">
            Nhân viên hoạt động
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#4CAF72]">
            {totalHoursAll.toFixed(1)}
          </p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">
            Tổng giờ làm tháng
          </p>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-sm overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-[#F5EDDF]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0F1E44] text-lg">group</span>
            <h3 className="text-sm font-bold text-[#0F1E44]">Danh sách nhân viên</h3>
          </div>
        </div>
        
        {sortedSummary.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">person_off</span>
            <p className="text-sm text-[#7A829A] font-medium">Không có dữ liệu giờ làm</p>
            <p className="text-xs text-[#7A829A] mt-1">Nhân viên chưa thực hiện check-in/check-out</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5EDDF]">
            {sortedSummary.map((summary) => (
              <div
                key={summary.userId}
                onClick={() => setSelectedEmployee(summary.userId)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                  selectedEmployee === summary.userId
                    ? 'bg-[#EFC14B]/10'
                    : 'hover:bg-[#FDF8EE]'
                }`}
              >
                <img
                  src={summary.userAvatar}
                  alt={summary.userName}
                  className="w-10 h-10 rounded-full object-cover border border-[#E8DFD0]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F1E44] truncate">{summary.userName}</p>
                  <p className="text-[10px] text-[#7A829A]">{summary.employeeCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-heading font-bold text-[#0F1E44]">
                    {summary.totalHours.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-[#7A829A] uppercase">giờ</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#4CAF72]">
                    {summary.checkInCount}
                  </p>
                  <p className="text-[10px] text-[#7A829A]">ca</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployeeSummary && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#F5EDDF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmployeeSummary.userAvatar}
                  alt={selectedEmployeeSummary.userName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#EFC14B]"
                />
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#0F1E44]">
                    {selectedEmployeeSummary.userName}
                  </h3>
                  <p className="text-xs text-[#7A829A]">{selectedEmployeeSummary.employeeCode}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-[#FDF8EE] rounded-lg"
              >
                <span className="material-symbols-outlined text-[#7A829A]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#4CAF72]/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-[#4CAF72]">
                    {selectedEmployeeSummary.totalHours.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Tổng giờ</p>
                </div>
                <div className="bg-[#EFC14B]/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-[#D4A833]">
                    {selectedEmployeeSummary.checkInCount}
                  </p>
                  <p className="text-[10px] text-[#7A829A] uppercase font-semibold">Số ca</p>
                </div>
              </div>

              {/* Records List */}
              <h4 className="text-sm font-bold text-[#0F1E44] mb-3">Chi tiết chấm công</h4>
              {selectedEmployeeSummary.records.length === 0 ? (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-4xl text-[#E8DFD0] mb-2 block">event_busy</span>
                  <p className="text-xs text-[#7A829A]">Chưa có dữ liệu chấm công</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEmployeeSummary.records.map((record) => {
                    const checkInTime = new Date(record.checkInTime);
                    const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
                    
                    return (
                      <div
                        key={record.id}
                        className="bg-[#FDF8EE] rounded-xl p-3 border border-[#E8DFD0]/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#0F1E44]">
                            {checkInTime.toLocaleDateString('vi-VN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'numeric',
                            })}
                          </span>
                          {record.hoursWorked && (
                            <span className="text-sm font-bold text-[#4CAF72]">
                              {record.hoursWorked.toFixed(2)}h
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-[#7A829A] uppercase mb-0.5">Check-in</p>
                            <p className="text-xs font-semibold text-[#0F1E44]">
                              {checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#7A829A] uppercase mb-0.5">Check-out</p>
                            <p className="text-xs font-semibold text-[#0F1E44]">
                              {checkOutTime
                                ? checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                : 'Đang làm'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#F5EDDF]">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE] border border-[#E8DFD0]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
