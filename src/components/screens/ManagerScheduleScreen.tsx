import React, { useState, useMemo, useCallback } from 'react';
import { User, NotificationItem } from '../../types';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  date: string; // YYYY-MM-DD
  shiftName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'swapped';
  notes?: string;
  swappedWith?: string; // employee ID if swapped
}

interface ManagerScheduleScreenProps {
  currentUser: User;
  allUsers: User[];
  shifts: Shift[];
  onAddShift: (shift: Shift) => void;
  onUpdateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onSwapShifts: (shift1Id: string, shift2Id: string) => void;
  onAddNotification: (notification: NotificationItem) => void;
}

// Helper: format date to YYYY-MM-DD using LOCAL time
const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: get Monday of the week
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: get 7 days of a week
const getWeekDays = (monday: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

// Shift templates
const SHIFT_TEMPLATES = [
  { name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  { name: 'Ca chiều', startTime: '13:00', endTime: '18:00' },
  { name: 'Ca tối', startTime: '18:00', endTime: '22:00' },
];

export const ManagerScheduleScreen: React.FC<ManagerScheduleScreenProps> = ({
  currentUser,
  allUsers,
  shifts,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onSwapShifts,
  onAddNotification,
}) => {
  // View state
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateStr(new Date()));

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Shift | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Shift | null>(null);
  const [showSwapModal, setShowSwapModal] = useState<Shift | null>(null);

  // Form state for add/edit
  const [formEmployee, setFormEmployee] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formShiftName, setFormShiftName] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Swap state
  const [swapTargetEmployee, setSwapTargetEmployee] = useState('');

  // Current Monday for week view
  const currentMonday = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);
  const todayStr = toDateStr(new Date());

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      // Employee filter
      if (filterEmployee !== 'all' && shift.employeeId !== filterEmployee) return false;

      // Shift filter
      if (filterShift !== 'all' && shift.shiftName !== filterShift) return false;

      return true;
    });
  }, [shifts, filterEmployee, filterShift, allUsers]);

  // Get shifts for a specific date
  const getShiftsForDate = useCallback(
    (dateStr: string): Shift[] => {
      return filteredShifts.filter((s) => s.date === dateStr);
    },
    [filteredShifts]
  );

  // Stats
  const stats = useMemo(() => {
    const weekShifts = filteredShifts.filter((s) => {
      const d = new Date(s.date + 'T00:00:00');
      return d >= weekDays[0] && d <= weekDays[6];
    });
    return {
      total: weekShifts.length,
      scheduled: weekShifts.filter((s) => s.status === 'scheduled').length,
      completed: weekShifts.filter((s) => s.status === 'completed').length,
      cancelled: weekShifts.filter((s) => s.status === 'cancelled').length,
    };
  }, [filteredShifts, weekDays]);

  // Week label
  const weekLabel = useMemo(() => {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
    return `${currentMonday.toLocaleDateString('vi-VN', opts)} – ${sunday.toLocaleDateString('vi-VN', opts)}`;
  }, [currentMonday]);

  // Reset form
  const resetForm = () => {
    setFormEmployee('');
    setFormDate('');
    setFormShiftName('');
    setFormStartTime('');
    setFormEndTime('');
    setFormNotes('');
  };

  // Open add modal
  const openAddModal = (date?: string) => {
    resetForm();
    if (date) setFormDate(date);
    setShowAddModal(true);
  };

  // Handle add shift
  const handleAddShift = () => {
    if (!formEmployee || !formDate || !formShiftName || !formStartTime || !formEndTime) return;

    const user = allUsers.find((u) => u.id === formEmployee);
    if (!user) return;

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      employeeId: formEmployee,
      employeeName: user.name,
      employeeAvatar: user.avatar,
      date: formDate,
      shiftName: formShiftName,
      startTime: formStartTime,
      endTime: formEndTime,
      status: 'scheduled',
      notes: formNotes || undefined,
    };

    onAddShift(newShift);

    // Notify employee
    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ca làm việc mới được thêm',
      message: `Bạn được phân công ${formShiftName} (${formStartTime} - ${formEndTime}) ngày ${formDate}`,
      time: 'Vừa xong',
      read: false,
      type: 'system',
      category: 'management',
    });

    setShowAddModal(false);
    resetForm();
  };

  // Open edit modal
  const openEditModal = (shift: Shift) => {
    setFormEmployee(shift.employeeId);
    setFormDate(shift.date);
    setFormShiftName(shift.shiftName);
    setFormStartTime(shift.startTime);
    setFormEndTime(shift.endTime);
    setFormNotes(shift.notes || '');
    setShowEditModal(shift);
  };

  // Handle edit shift
  const handleEditShift = () => {
    if (!showEditModal || !formShiftName || !formStartTime || !formEndTime) return;

    const updatedShift: Shift = {
      ...showEditModal,
      shiftName: formShiftName,
      startTime: formStartTime,
      endTime: formEndTime,
      notes: formNotes || undefined,
    };

    onUpdateShift(updatedShift);

    // Notify employee
    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ca làm việc được chỉnh sửa',
      message: `Ca ${formShiftName} (${formStartTime} - ${formEndTime}) ngày ${showEditModal.date} đã được chỉnh sửa`,
      time: 'Vừa xong',
      read: false,
      type: 'system',
      category: 'management',
    });

    setShowEditModal(null);
    resetForm();
  };

  // Handle delete shift
  const handleDeleteShift = () => {
    if (!showDeleteConfirm) return;

    onDeleteShift(showDeleteConfirm.id);

    // Notify employee
    onAddNotification({
      id: `notif-${Date.now()}`,
      title: 'Ca làm việc bị hủy',
      message: `Ca ${showDeleteConfirm.shiftName} (${showDeleteConfirm.startTime} - ${showDeleteConfirm.endTime}) ngày ${showDeleteConfirm.date} đã bị hủy`,
      time: 'Vừa xong',
      read: false,
      type: 'penalty',
      category: 'management',
    });

    setShowDeleteConfirm(null);
  };

  // Handle swap shift
  const handleSwapShift = () => {
    if (!showSwapModal || !swapTargetEmployee) return;

    // Find a shift for the target employee on the same date
    const targetShift = filteredShifts.find(
      (s) => s.employeeId === swapTargetEmployee && s.date === showSwapModal.date && s.id !== showSwapModal.id
    );

    if (targetShift) {
      onSwapShifts(showSwapModal.id, targetShift.id);

      // Notify both employees
      onAddNotification({
        id: `notif-${Date.now()}`,
        title: 'Đổi ca thành công',
        message: `Ca ${showSwapModal.shiftName} ngày ${showSwapModal.date} đã được đổi với ${targetShift.employeeName}`,
        time: 'Vừa xong',
        read: false,
        type: 'system',
        category: 'management',
      });
    }

    setShowSwapModal(null);
    setSwapTargetEmployee('');
  };

  // Vietnamese day names
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="pb-28 pt-20 px-4 max-w-6xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Quản lý lịch làm việc</h2>
          <p className="text-xs text-[#7A829A] mt-0.5">Quản lý và phân công ca làm cho tất cả nhân viên</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Thêm ca mới</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#0F1E44]">{stats.total}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tổng ca tuần</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#4CAF72]">{stats.scheduled}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Sắp tới</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#EFC14B]">{stats.completed}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Hoàn thành</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
          <p className="text-2xl font-heading font-bold text-[#FF3131]">{stats.cancelled}</p>
          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Đã hủy</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-[#EFC14B] text-xl">filter_list</span>
          <h3 className="text-sm font-bold text-[#0F1E44]">Bộ lọc</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#7A829A] mb-1">Nhân viên</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
            >
              <option value="all">Tất cả</option>
              {allUsers
                .filter((u) => u.role !== 'manager')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7A829A] mb-1">Ca làm</label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="Ca sáng">Ca sáng</option>
              <option value="Ca chiều">Ca chiều</option>
              <option value="Ca tối">Ca tối</option>
            </select>
          </div>
        </div>
        {(filterEmployee !== 'all' || filterShift !== 'all') && (
          <button
            onClick={() => {
              setFilterEmployee('all');
              setFilterShift('all');
            }}
            className="mt-3 text-xs font-semibold text-[#EFC14B] hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-sm mb-5">
        <div className="px-5 py-3 border-b border-[#F5EDDF] flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FDF8EE] transition-colors"
          >
            <span className="material-symbols-outlined text-[#0F1E44] text-xl">chevron_left</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="font-heading font-bold text-sm text-[#0F1E44]">Tuần {weekLabel}</span>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-[10px] font-semibold text-[#EFC14B] hover:underline mt-0.5">
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

        {/* View toggle */}
        <div className="px-5 py-2 border-b border-[#F5EDDF] flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'week' ? 'bg-[#0F1E44] text-white' : 'bg-[#FDF8EE] text-[#7A829A] hover:bg-[#EFC14B]/20'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] mr-1">grid_view</span>
            Tuần
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#0F1E44] text-white' : 'bg-[#FDF8EE] text-[#7A829A] hover:bg-[#EFC14B]/20'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] mr-1">view_list</span>
            Danh sách
          </button>
        </div>

        {/* Week Grid View */}
        {viewMode === 'week' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date, idx) => {
                const dateStr = toDateStr(date);
                const dayNum = date.getDate();
                const dayName = dayNames[idx];
                const isTodayDate = dateStr === todayStr;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayShifts = getShiftsForDate(dateStr);

                return (
                  <div
                    key={dateStr}
                    onClick={() => !isWeekend && setSelectedDate(dateStr)}
                    className={`rounded-xl p-2 transition-all cursor-pointer ${
                      selectedDate === dateStr
                        ? 'bg-[#0F1E44] text-white shadow-md'
                        : isTodayDate
                        ? 'bg-[#EFC14B]/20 border-2 border-[#EFC14B]'
                        : isWeekend
                        ? 'bg-[#F5EDDF] text-[#7A829A]'
                        : 'bg-[#FDF8EE] hover:bg-[#EFC14B]/10'
                    }`}
                  >
                    <div className="text-center mb-2">
                      <span className={`text-[10px] font-semibold ${selectedDate === dateStr ? 'text-white/70' : 'text-[#7A829A]'}`}>
                        {dayName}
                      </span>
                      <p className={`text-lg font-bold ${selectedDate === dateStr ? 'text-white' : 'text-[#0F1E44]'}`}>{dayNum}</p>
                    </div>
                    <div className="space-y-1">
                      {isWeekend ? (
                        <span className="text-[8px] text-center block text-[#7A829A]">Nghỉ</span>
                      ) : dayShifts.length === 0 ? (
                        <span className="text-[8px] text-center block text-[#7A829A]">Trống</span>
                      ) : (
                        dayShifts.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className={`text-[8px] px-1 py-0.5 rounded text-center truncate ${
                              s.status === 'cancelled'
                                ? 'bg-[#FF3131]/20 text-[#FF3131] line-through'
                                : s.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.shiftName.replace('Ca ', '')}
                          </div>
                        ))
                      )}
                      {!isWeekend && dayShifts.length > 3 && (
                        <span className="text-[8px] text-center block text-[#7A829A]">+{dayShifts.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="p-4">
            <div className="space-y-3">
              {weekDays.map((date) => {
                const dateStr = toDateStr(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayShifts = getShiftsForDate(dateStr);
                const isTodayDate = dateStr === todayStr;

                return (
                  <div key={dateStr} className={`rounded-xl border ${isTodayDate ? 'border-[#EFC14B]' : 'border-[#E8DFD0]'} overflow-hidden`}>
                    <div className={`px-4 py-2 flex items-center justify-between ${isTodayDate ? 'bg-[#EFC14B]/10' : 'bg-[#FDF8EE]'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isTodayDate ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                          {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                        </span>
                        {isTodayDate && (
                          <span className="text-[9px] font-bold bg-[#EFC14B] text-[#0F1E44] px-1.5 py-0.5 rounded">HÔM NAY</span>
                        )}
                      </div>
                      {!isWeekend && (
                        <button
                          onClick={() => openAddModal(dateStr)}
                          className="text-[10px] font-semibold text-[#EFC14B] hover:underline"
                        >
                          + Thêm ca
                        </button>
                      )}
                    </div>
                    {isWeekend ? (
                      <div className="px-4 py-3 text-center text-xs text-[#7A829A]">Ngày nghỉ</div>
                    ) : dayShifts.length === 0 ? (
                      <div className="px-4 py-3 text-center text-xs text-[#7A829A]">Chưa có ca nào</div>
                    ) : (
                      <div className="divide-y divide-[#F5EDDF]">
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={shift.employeeAvatar} alt={shift.employeeName} className="w-8 h-8 rounded-full object-cover" />
                              <div>
                                <p className="text-sm font-semibold text-[#0F1E44]">{shift.employeeName}</p>
                                <p className="text-xs text-[#7A829A]">
                                  {shift.shiftName} • {shift.startTime} - {shift.endTime}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  shift.status === 'cancelled'
                                    ? 'bg-[#FF3131]/15 text-[#FF3131]'
                                    : shift.status === 'completed'
                                    ? 'bg-[#4CAF72]/15 text-[#4CAF72]'
                                    : 'bg-[#EFC14B]/20 text-[#D4A833]'
                                }`}
                              >
                                {shift.status === 'cancelled' ? 'Đã hủy' : shift.status === 'completed' ? 'Hoàn thành' : 'Đã lên lịch'}
                              </span>
                              {shift.status !== 'cancelled' && (
                                <div className="flex gap-1">
                                  <button onClick={() => openEditModal(shift)} className="p-1 hover:bg-[#FDF8EE] rounded">
                                    <span className="material-symbols-outlined text-[14px] text-[#7A829A]">edit</span>
                                  </button>
                                  <button onClick={() => setShowSwapModal(shift)} className="p-1 hover:bg-[#FDF8EE] rounded">
                                    <span className="material-symbols-outlined text-[14px] text-[#7A829A]">swap_horiz</span>
                                  </button>
                                  <button onClick={() => setShowDeleteConfirm(shift)} className="p-1 hover:bg-[#FF3131]/10 rounded">
                                    <span className="material-symbols-outlined text-[14px] text-[#FF3131]">delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-[#E8DFD0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Thêm ca làm việc mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Nhân viên</label>
                <select
                  value={formEmployee}
                  onChange={(e) => setFormEmployee(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                >
                  <option value="">Chọn nhân viên</option>
                  {allUsers
                    .filter((u) => u.role !== 'manager')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} - {u.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Ngày</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Loại ca</label>
                <div className="flex gap-2">
                  {SHIFT_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        setFormShiftName(t.name);
                        setFormStartTime(t.startTime);
                        setFormEndTime(t.endTime);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        formShiftName === t.name
                          ? 'bg-[#0F1E44] text-white'
                          : 'bg-[#FDF8EE] text-[#3D4663] hover:bg-[#EFC14B]/20'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7A829A] mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A829A] mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Ghi chú</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)"
                  rows={2}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]">
                Hủy
              </button>
              <button
                onClick={handleAddShift}
                disabled={!formEmployee || !formDate || !formShiftName}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A] disabled:opacity-50"
              >
                Thêm ca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-[#E8DFD0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Chỉnh sửa ca làm việc</h3>
              <button onClick={() => setShowEditModal(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-[#FDF8EE] rounded-lg p-3">
                <p className="text-xs text-[#7A829A]">Nhân viên:</p>
                <p className="text-sm font-semibold text-[#0F1E44]">{showEditModal.employeeName}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Loại ca</label>
                <div className="flex gap-2">
                  {SHIFT_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        setFormShiftName(t.name);
                        setFormStartTime(t.startTime);
                        setFormEndTime(t.endTime);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        formShiftName === t.name
                          ? 'bg-[#0F1E44] text-white'
                          : 'bg-[#FDF8EE] text-[#3D4663] hover:bg-[#EFC14B]/20'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7A829A] mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A829A] mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Ghi chú</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú (tùy chọn)"
                  rows={2}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]">
                Hủy
              </button>
              <button onClick={handleEditShift} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A]">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-lg border border-[#E8DFD0] text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#FF3131]/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-[#FF3131]">delete</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Xác nhận xóa ca?</h3>
            <p className="text-xs text-[#7A829A] mb-4">
              Ca {showDeleteConfirm.shiftName} ({showDeleteConfirm.startTime} - {showDeleteConfirm.endTime}) ngày {showDeleteConfirm.date} sẽ bị xóa.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#7A829A] hover:bg-[#FDF8EE] rounded-xl border border-[#E8DFD0]"
              >
                Hủy
              </button>
              <button onClick={handleDeleteShift} className="flex-1 py-2.5 text-xs font-bold bg-[#FF3131] text-white rounded-xl hover:bg-[#D42C2C]">
                Xóa ca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Shift Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-lg border border-[#E8DFD0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Đổi ca làm việc</h3>
              <button onClick={() => setShowSwapModal(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bg-[#FDF8EE] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#7A829A] mb-1">Ca hiện tại:</p>
              <div className="flex items-center gap-3">
                <img src={showSwapModal.employeeAvatar} alt={showSwapModal.employeeName} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-[#0F1E44]">{showSwapModal.employeeName}</p>
                  <p className="text-xs text-[#7A829A]">
                    {showSwapModal.shiftName} • {showSwapModal.startTime} - {showSwapModal.endTime}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A829A] mb-1">Đổi với nhân viên:</label>
              <select
                value={swapTargetEmployee}
                onChange={(e) => setSwapTargetEmployee(e.target.value)}
                className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
              >
                <option value="">Chọn nhân viên</option>
                {allUsers
                  .filter((u) => u.id !== showSwapModal.employeeId && u.role !== 'manager')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} - {u.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowSwapModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]">
                Hủy
              </button>
              <button
                onClick={handleSwapShift}
                disabled={!swapTargetEmployee}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A] disabled:opacity-50"
              >
                Xác nhận đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
