import React, { useState, useMemo } from 'react';
import {
  User,
  StudySchedule,
  DayStudySchedule,
  DayStudySchedule as DayStudyScheduleType,
  StudyTimeSlot,
  WeeklyShiftRegistration,
  DayOfWeek,
  ShiftCapacityOverride,
  ShiftSlot,
} from '../../types';
import { Shift } from './ManagerScheduleScreen';
import { getShiftTimeRange } from '../../utils/constants';
import {
  getSlotAvailability,
} from '../../utils/autoSchedule';
import { getCapacityForDate } from '../../hooks/useShiftCapacity';

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DAY_KEYS: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

// 3 ca cố định. KHUNG GIỜ KHÔNG CỐ ĐỊNH Ở ĐÂY — hiển thị động theo loại
// nhân viên qua getShiftTimeRange() (part-time vs full-time khác giờ).
const SHIFT_SLOTS: { value: 'morning' | 'afternoon' | 'evening'; name: string; icon: string; short: string }[] = [
  { value: 'morning', name: 'Ca sáng', icon: '🌅', short: 'Sáng' },
  { value: 'afternoon', name: 'Ca chiều', icon: '☀️', short: 'Chiều' },
  { value: 'evening', name: 'Ca tối', icon: '🌙', short: 'Tối' },
];

// Helper functions
const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getNextMonday = (): Date => {
  const today = new Date();
  const monday = getMonday(today);
  monday.setDate(monday.getDate() + 7);
  return monday;
};

const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
};

interface StudyScheduleScreenProps {
  currentUser: User;
  studySchedules: StudySchedule[];
  registrations: WeeklyShiftRegistration[];
  /** Lịch chính thức — để đếm người/ca và chặn ca đã đầy (mục 5). */
  shifts: Shift[];
  capacityOverrides: ShiftCapacityOverride[];
  onSubmitStudySchedule: (schedule: StudySchedule) => void;
  onSubmitRegistration: (reg: WeeklyShiftRegistration) => void;
  onUpdateRegistration: (reg: WeeklyShiftRegistration) => void;
}

export const StudyScheduleScreen: React.FC<StudyScheduleScreenProps> = ({
  currentUser,
  studySchedules,
  registrations,
  shifts,
  capacityOverrides,
  onSubmitStudySchedule,
  onSubmitRegistration,
  onUpdateRegistration,
}) => {
  const targetWeekMonday = useMemo(() => getNextMonday(), []);
  const targetWeekStr = useMemo(() => toDateStr(targetWeekMonday), [targetWeekMonday]);
  const targetWeekNum = useMemo(() => getISOWeekNumber(targetWeekMonday), [targetWeekMonday]);
  const targetYear = targetWeekMonday.getFullYear();

  // Check existing study schedule
  const existingSchedule = useMemo(() => {
    return studySchedules.find(
      (s) => s.userId === currentUser.id && s.weekStart === targetWeekStr
    );
  }, [studySchedules, currentUser.id, targetWeekStr]);

  // Check existing shift registration
  const existingReg = useMemo(() => {
    return registrations.find(
      (r) => r.userId === currentUser.id && r.weekStart === targetWeekStr
    );
  }, [registrations, currentUser.id, targetWeekStr]);

  // Day study schedule state
  const [daySchedules, setDaySchedules] = useState<DayStudyScheduleType[]>(() => {
    if (existingSchedule) return existingSchedule.days;
    return DAY_KEYS.map((day) => ({
      day,
      isBusy: false,
      timeSlots: [],
      note: '',
    }));
  });

  // Shift preferences
  const [shiftPreferences, setShiftPreferences] = useState<Record<string, ShiftSlot>>(() => {
    const initial: Record<string, ShiftSlot> = {};
    if (existingReg) {
      existingReg.days.forEach((d) => {
        initial[d.date] = d.shift;
      });
    }
    return initial;
  });

  // XIN NGHỈ (type 'leave'): các ngày NV tường minh xin nghỉ. Mutual exclusive
  // với chọn ca trong cùng ngày — chọn ca gỡ nghỉ, chọn nghỉ gỡ ca.
  const [leaveDays, setLeaveDays] = useState<Set<string>>(() => {
    if (!existingReg) return new Set();
    return new Set(existingReg.days.filter((d) => d.type === 'leave').map((d) => d.date));
  });

  // Bật/tắt xin nghỉ 1 ngày: bật → gỡ ca đã chọn của ngày đó; tắt → ngày
  // trở về mặc định (không đăng ký). Không cần lý do (đã bỏ theo yêu cầu).
  const toggleLeave = (dateStr: string) => {
    setLeaveDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
        // Bỏ chọn ca của ngày này — 2 loại lựa chọn loại trừ lẫn nhau.
        setShiftPreferences((p) => ({ ...p, [dateStr]: 'off' }));
      }
      return next;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'study' | 'shifts'>('study');

  // Toggle day busy status
  const toggleDayBusy = (day: DayOfWeek) => {
    setDaySchedules((prev) =>
      prev.map((d) =>
        d.day === day ? { ...d, isBusy: !d.isBusy, timeSlots: !d.isBusy ? d.timeSlots : [] } : d
      )
    );
  };

  // Add time slot to a day
  const addTimeSlot = (day: DayOfWeek) => {
    setDaySchedules((prev) =>
      prev.map((d) =>
        d.day === day
          ? { ...d, timeSlots: [...d.timeSlots, { startTime: '08:00', endTime: '10:00', subject: '' }] }
          : d
      )
    );
  };

  // Remove time slot from a day
  const removeTimeSlot = (day: DayOfWeek, index: number) => {
    setDaySchedules((prev) =>
      prev.map((d) =>
        d.day === day
          ? { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== index) }
          : d
      )
    );
  };

  // Update time slot
  const updateTimeSlot = (day: DayOfWeek, index: number, field: keyof StudyTimeSlot, value: string) => {
    setDaySchedules((prev) =>
      prev.map((d) =>
        d.day === day
          ? {
              ...d,
              timeSlots: d.timeSlots.map((slot, i) =>
                i === index ? { ...slot, [field]: value } : slot
              ),
            }
          : d
      )
    );
  };

  // Set shift preference for a date
  const setShiftPreference = (date: string, shift: ShiftSlot) => {
    setShiftPreferences((prev) => ({
      ...prev,
      [date]: prev[date] === shift ? 'off' : shift,
    }));
  };

  // Handle submit
  const handleSubmit = () => {
    setIsSaving(true);
    const now = new Date().toISOString();

    // Submit study schedule
    const studySchedule: StudySchedule = {
      id: existingSchedule?.id || `study-${crypto.randomUUID()}-${currentUser.id}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      weekStart: targetWeekStr,
      year: targetYear,
      weekNumber: targetWeekNum,
      days: daySchedules,
      submittedAt: now,
    };
    onSubmitStudySchedule(studySchedule);

    // Submit shift registration
    const days = [];
    const targetWeekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(targetWeekMonday);
      d.setDate(targetWeekMonday.getDate() + i);
      targetWeekDays.push(d);
    }

    targetWeekDays.forEach((day, idx) => {
      const dateStr = toDateStr(day);
      const isLeave = leaveDays.has(dateStr);
      const pref = isLeave ? 'off' : (shiftPreferences[dateStr] || 'off');
      days.push({
        date: dateStr,
        dayLabel: DAY_LABELS[idx],
        // Leave days carry NO time slot — shift stays 'off' by contract.
        shift: pref as ShiftSlot,
        type: isLeave ? 'leave' : 'shift',
      });
    });

    const reg: WeeklyShiftRegistration = {
      id: existingReg?.id || `reg-${crypto.randomUUID()}-${currentUser.id}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      weekStart: targetWeekStr,
      year: targetYear,
      weekNumber: targetWeekNum,
      days,
      status: 'submitted',
      submittedAt: now,
      createdAt: existingReg?.createdAt || now,
      updatedAt: now,
    };

    if (existingReg) {
      onUpdateRegistration(reg);
    } else {
      onSubmitRegistration(reg);
    }

    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  return (
    <div className="pb-safe-bottom pt-safe-top px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Đăng ký lịch</h2>
        <p className="text-xs text-[#7A829A] mt-0.5">
          Gửi lịch học bận và đăng ký ca làm việc cho tuần tiếp theo
        </p>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-[#4CAF72]/15 text-[#4CAF72] text-sm font-semibold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Đã gửi lịch học & đăng ký ca thành công!
        </div>
      )}

      {/* Week info card */}
      <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">
              Tuần đăng ký
            </p>
            <p className="text-white font-heading font-bold text-lg">
              Tuần {targetWeekNum}
            </p>
            <p className="text-white/80 text-xs">{formatWeekRange(targetWeekMonday)}</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">calendar_month</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 bg-[#F5EDDF] rounded-xl p-1">
        <button
          onClick={() => setActiveTab('study')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'study'
              ? 'bg-[#0F1E44] text-white shadow-sm'
              : 'text-[#7A829A] hover:text-[#0F1E44]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">school</span>
          Lịch học bận
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'shifts'
              ? 'bg-[#0F1E44] text-white shadow-sm'
              : 'text-[#7A829A] hover:text-[#0F1E44]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">work</span>
          Đăng ký ca làm
        </button>
      </div>

      {/* Study Schedule Tab */}
      {activeTab === 'study' && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-[#7A829A]">
            Chọn các ngày bận học trong tuần. Quản lý sẽ dựa vào đây để xếp ca phù hợp.
          </p>

          {daySchedules.map((daySchedule, idx) => {
            const date = new Date(targetWeekMonday);
            date.setDate(targetWeekMonday.getDate() + idx);
            const isToday = toDateStr(new Date()) === toDateStr(date);

            return (
              <div
                key={daySchedule.day}
                className={`bg-white rounded-xl border p-3 transition-all ${
                  daySchedule.isBusy
                    ? 'border-[#FF3131]/50 bg-[#FF3131]/5'
                    : isToday
                    ? 'border-[#EFC14B]'
                    : 'border-[#E8DFD0]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 text-center ${isToday ? 'text-[#EFC14B]' : ''}`}>
                      <p className="text-[10px] text-[#7A829A] uppercase">{DAY_LABELS[idx]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                        {date.getDate()}/{date.getMonth() + 1}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F1E44]">
                        {daySchedule.isBusy ? '📚 Bận học' : '✓ Rảnh'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDayBusy(daySchedule.day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      daySchedule.isBusy
                        ? 'bg-[#FF3131] text-white'
                        : 'bg-[#4CAF72]/15 text-[#4CAF72] hover:bg-[#4CAF72]/25'
                    }`}
                  >
                    {daySchedule.isBusy ? 'Hủy bận' : 'Đánh dấu bận'}
                  </button>
                </div>

                {/* Time slots when busy */}
                {daySchedule.isBusy && (
                  <div className="mt-2 space-y-2">
                    {daySchedule.timeSlots.map((slot, slotIdx) => (
                      <div key={slotIdx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-[#E8DFD0]/50">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(daySchedule.day, slotIdx, 'startTime', e.target.value)}
                            className="rounded-lg border border-[#E8DFD0] px-2 py-1.5 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                          />
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(daySchedule.day, slotIdx, 'endTime', e.target.value)}
                            className="rounded-lg border border-[#E8DFD0] px-2 py-1.5 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                          />
                        </div>

                        <button
                          onClick={() => removeTimeSlot(daySchedule.day, slotIdx)}
                          className="p-1.5 hover:bg-[#FF3131]/10 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[#FF3131]">close</span>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTimeSlot(daySchedule.day)}
                      className="w-full py-2 border border-dashed border-[#E8DFD0] rounded-lg text-xs font-semibold text-[#7A829A] hover:border-[#EFC14B] hover:text-[#0F1E44] transition-colors"
                    >
                      + Thêm khung giờ học
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Shift Registration Tab */}
      {activeTab === 'shifts' && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-[#7A829A]">
            Chọn ca làm việc bạn muốn đăng ký cho tuần tới.
          </p>          {DAY_KEYS.map((day, idx) => {
            const date = new Date(targetWeekMonday);
            date.setDate(targetWeekMonday.getDate() + idx);
            const dateStr = toDateStr(date);
            const isToday = toDateStr(new Date()) === dateStr;
            const isPast = dateStr < toDateStr(new Date());
            const daySchedule = daySchedules.find(d => d.day === day);
            const isBusy = daySchedule?.isBusy || false;
            const selectedShift = shiftPreferences[dateStr] || '';
            const isLeave = selectedShift === 'off' && leaveDays.has(dateStr);
            // Giờ hiển thị = map (ca đã chọn, loại NV) — nhân viên KHÔNG
            // chọn giờ, chỉ được xem khung giờ hệ thống sẽ xếp (mục 4).
            const selectedTime =
              selectedShift && selectedShift !== 'off'
                ? getShiftTimeRange(selectedShift as 'morning' | 'afternoon' | 'evening', currentUser.employmentType)
                : null;

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-xl border p-3 transition-all ${
                  isBusy
                    ? 'border-[#FF3131]/30 opacity-60'
                    : isLeave
                    ? 'border-[#D4A833]/60 bg-[#EFC14B]/10'
                    : isToday
                    ? 'border-[#EFC14B]' 
                    : 'border-[#E8DFD0]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-14 text-center ${isToday ? 'text-[#EFC14B]' : ''}`}>
                    <p className="text-[10px] text-[#7A829A] uppercase">{DAY_LABELS[idx]}</p>
                    <p className={`text-sm font-bold ${isToday ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                      {date.getDate()}/{date.getMonth() + 1}
                    </p>
                  </div>
                  <div className="flex-1">
                    {isBusy ? (
                      <p className="text-xs text-[#FF3131] font-semibold">📚 Bận học</p>
                    ) : (
                      <>
                        {/* XIN NGHỈ — loại trừ lẫn nhau với mọi ca trong ngày:
                            chọn Nghỉ → bỏ chọn ca đã chọn; chọn ca → gỡ Nghỉ.
                            Ngày quá khứ không cho xin nghỉ (cùng rule với ca). */}
                        <div className="flex gap-1.5 mb-1.5">
                          <button
                            onClick={() => toggleLeave(dateStr)}
                            disabled={isPast}
                            title={isPast ? 'Không thể xin nghỉ cho ngày đã qua' : 'Xin nghỉ cả ngày — các ca đã chọn sẽ bị gỡ'}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                              isLeave
                                ? 'bg-[#D4A833] text-white border-[#D4A833]'
                                : isPast
                                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                : 'bg-white text-[#D4A833] border-[#D4A833]/40 hover:bg-[#EFC14B]/10'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{isLeave ? 'beach_access' : 'event_busy'}</span>
                            {isLeave ? 'Đã xin nghỉ ngày này' : 'Nghỉ (xin nghỉ ngày này)'}
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          {SHIFT_SLOTS.map((slot) => {
                            // Hint dùng CHÍNH getSlotAvailability — hàm duy nhất
                            // mà engine dùng để chặn khi lưu. Hint và luật không
                            // thể lệch nhau vì là CÙNG một phép tính; own auto
                            // rows không chiếm chỗ của chính mình (đúng luật
                            // resubmission của engine).
                            const av = getSlotAvailability(
                              shifts, dateStr, slot.name, capacityOverrides,
                              currentUser.id
                            );
                            const count = av.taken;
                            const max = av.max;
                            const isFull = av.isFull;
                            const disabled = (isFull && selectedShift !== slot.value) || isPast;
                            const tr = getShiftTimeRange(slot.value, currentUser.employmentType);
                            return (
                              <button
                                key={slot.value}
                                onClick={() => {
                                  if (disabled) return;
                                  // Chọn ca → gỡ trạng thái Nghỉ của ngày (mutual exclusion)
                                  setLeaveDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
                                  setShiftPreference(dateStr, slot.value);
                                }}
                                disabled={disabled}
                                title={isFull ? 'Ca đã đầy' : `${slot.name}: ${tr.start}–${tr.end}`}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                  selectedShift === slot.value
                                    ? 'bg-[#0F1E44] text-white border-[#0F1E44]'
                                    : disabled
                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                    : 'bg-white text-[#7A829A] border-[#E8DFD0] hover:border-[#EFC14B]'
                                }`}
                              >
                                <span className="leading-none">{slot.icon} {slot.short}</span>
                                <span className={`text-[8px] leading-none ${
                                  selectedShift === slot.value
                                    ? 'text-white/70'
                                    : isFull
                                    ? 'text-[#FF3131]/70'
                                    : av.remaining === 1
                                    ? 'text-[#D4A833]'
                                    : 'text-[#4CAF72]'
                                }`}>
                                  {isFull ? 'Đầy' : `Còn ${av.remaining}/${av.max}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {isLeave ? (
                          <p className="text-[9px] text-[#D4A833] mt-1">
                            🏖️ Đã chọn nghỉ cả ngày — không đăng ký ca nào cho ngày này.
                          </p>
                        ) : selectedTime && (
                          <p className="text-[9px] text-[#7A829A] mt-1">
                            Giờ của bạn: <strong className="text-[#0F1E44]">{selectedTime.start}–{selectedTime.end}</strong>
                          </p>
                        )}
                        {/* Chỗ cuối cùng sắp mất: nhấn mạnh để NV tự quyết
                            trước khi submit thay vì phát hiện conflict sau. */}
                        {SHIFT_SLOTS.some((slot) => {
                          const s = shiftPreferences[dateStr];
                          return s && s !== 'off' &&
                            s !== slot.value &&
                            getSlotAvailability(shifts, dateStr, slot.name, capacityOverrides, currentUser.id).isFull;
                        }) && (
                          <p className="text-[9px] text-[#FF3131] mt-1">
                            Một số ca trong ngày này đã đủ người — hệ thống xếp theo thứ tự đăng ký trước.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSaving}
        className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Đang gửi...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">send</span>
            <span>Gửi lịch học & Đăng ký ca</span>
          </>
        )}
      </button>

      {/* Info note */}
      <div className="mt-4 bg-[#FDF8EE] border border-[#E8DFD0] rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-[#EFC14B] text-xl mt-0.5">info</span>
        <div>
          <h4 className="text-sm font-bold text-[#0F1E44] mb-1">Hướng dẫn</h4>
          <ul className="text-xs text-[#7A829A] space-y-1">
            <li>• Đánh dấu <strong>ngày bận học</strong> để Quản lý biết bạn không thể đi làm</li>
            <li>• Đăng ký <strong>ca làm việc mong muốn</strong> cho các ngày rảnh</li>
            <li>• Khung giờ tự động theo loại nhân viên của bạn
              {currentUser.employmentType === 'full-time' ? ' (Full-time: Sáng 06:30–15:00, Chiều/Tối 14:30–23:00)' : ' (Part-time: Sáng 06:30–11:30, Chiều 11:30–17:30, Tối 17:30–22:30)'}</li>
            <li>• Ca đã đủ số người sẽ khóa — hệ thống xếp theo thứ tự đăng ký trước</li>
            <li>• Form mở từ <strong>Thứ 6 đến Chủ nhật</strong> hàng tuần</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
