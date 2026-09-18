/**
 * batchAutoSchedule —全局自动排班引擎
 *
 * Bước 1: Thu thập tất cả nhân viên + đăng ký + lịch học + ngày nghỉ cho tuần.
 * Bước 2: Với mỗi (ngày, ca), lọc nhân viên đủ điều kiện.
 * Bước 3: Xếp theo thứ tự ưu tiên (ít ca nhất trong tuần → ưu tiên trước).
 * Bước 4: Đánh dấu kết quả: slot đủ → xếp, slot thiếu → understaffed warning.
 *
 * KHÔNG phá vỡ ràng buộc ngày nghỉ/học — chỉ cảnh báo khi thiếu người.
 */

import {
  User,
  WeeklyShiftRegistration,
  StudySchedule,
  ShiftSlot,
  EmploymentType,
  ShiftCapacityOverride,
} from '../types';
import { Shift } from '../components/screens/ManagerScheduleScreen';
import { SHIFT_SLOT_TEMPLATES, getShiftTimeRange } from './constants';
import { getCapacityForDate } from '../hooks/useShiftCapacity';

// ─── Types ───────────────────────────────────────

export interface BatchSlotResult {
  date: string;
  shiftName: string;
  assignedUsers: string[];     // userId được xếp
  capacity: number;            // max yêu cầu
  isUnderstaffed: boolean;     // true nếu assigned < capacity
  missingCount: number;        // số người thiếu (0 nếu đủ)
}

export interface BatchAutoScheduleResult {
  /** Hàng oficial mới cho unified shifts store. */
  shifts: Shift[];
  /** Kết quả chi tiết từng slot (để UI hiển thị bảng). */
  slotResults: BatchSlotResult[];
  /** Danh sách cảnh báo thiếu người (subset của slotResults where understaffed). */
  understaffedWarnings: BatchSlotResult[];
  /** Số slot đã xếp thành công / tổng slot cần xếp. */
  summary: {
    totalSlots: number;
    filledSlots: number;
    understaffedSlots: number;
    totalAssigned: number;
    totalRequested: number;
  };
}

// ─── Helpers ─────────────────────────────────────

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Tạo mảng 7 ngày (Thứ 2 → Chủ nhật) từ ngày bắt đầu tuần. */
const weekDates = (weekStart: string): string[] => {
  const d = new Date(weekStart + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    return toDateStr(cur);
  });
};

/** Kiểm tra xem khung giờ ca có trùng với lịch học bận không. */
const hasStudyConflict = (
  studySchedule: StudySchedule | undefined,
  dayOfWeek: number,    // 0=Thứ2..6=CN
  shiftStart: string,
  shiftEnd: string
): boolean => {
  if (!studySchedule) return false;
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const dayName = dayNames[dayOfWeek];
  const dayData = studySchedule.days.find(d => d.day === dayName);
  if (!dayData || !dayData.isBusy) return false;

  // Nếu bận cả ngày (không có timeSlots cụ thể) → chặn mọi ca
  if (dayData.timeSlots.length === 0) return true;

  // Nếu có timeSlots → kiểm tra overlap
  for (const slot of dayData.timeSlots) {
    if (slot.startTime < shiftEnd && slot.endTime > shiftStart) {
      return true; // overlap
    }
  }
  return false;
};

// ─── Main Engine ─────────────────────────────────

/**
 * Xếp ca tự động cho TOÀN BỘ nhân viên trong một tuần.
 *
 * @param allUsers        Tất cả nhân viên (bao gồm manager, nhưng manager bị bỏ qua)
 * @param registrations   Tất cả đăng ký ca làm của tuần
 * @param studySchedules  Tất cả lịch học bận của tuần
 * @param existingShifts  Hàng shift hiện có trong store (manual rows được giữ nguyên)
 * @param weekStart       Ngày bắt đầu tuần (YYYY-MM-DD, Thứ 2)
 * @param capacityOverrides  Manager overrides cho capacity
 */
export function computeBatchAutoSchedule(
  allUsers: User[],
  registrations: WeeklyShiftRegistration[],
  studySchedules: StudySchedule[],
  existingShifts: Shift[],
  weekStart: string,
  capacityOverrides: ShiftCapacityOverride[]
): BatchAutoScheduleResult {
  const dates = weekDates(weekStart);
  const shifts = ['morning', 'afternoon', 'evening'] as const;
  const SHIFT_NAMES: Record<typeof shifts[number], string> = {
    morning: 'Ca sáng',
    afternoon: 'Ca chiều',
    evening: 'Ca tối',
  };

  // ── Bước 1: Lọc nhân viên (bỏ manager) ──
  const employees = allUsers.filter(u => u.role === 'manager' ? false : (u.isAccountActive !== false));

  // ── Bước 2: Tạo map đăng ký nhanh ──
  const regMap = new Map<string, WeeklyShiftRegistration>();
  registrations.forEach(r => regMap.set(r.userId, r));

  const studyMap = new Map<string, StudySchedule>();
  studySchedules.forEach(s => studyMap.set(s.userId, s));

  // ── Bước 3: Giữ nguyên manual rows ──
  const manualRows = existingShifts.filter(s => s.origin === 'manual' && s.status !== 'cancelled');

  // Đếm số ca auto đã xếp sẵn cho mỗi nhân viên (để fairness tính)
  const existingAutoCount = new Map<string, number>();
  existingShifts.forEach(s => {
    if (s.origin === 'auto' && s.status !== 'cancelled') {
      existingAutoCount.set(s.employeeId, (existingAutoCount.get(s.employeeId) || 0) + 1);
    }
  });

  // ── Bước 4: Xếp từng slot ──
  const allPlaced: Shift[] = [];
  const slotResults: BatchSlotResult[] = [];
  // Theo dõi nhân viên đã xếp trong ngày (để tránh chồng giờ)
  const assignedToday = new Map<string, Set<string>>(); // date → Set<userId>

  // Track: số ca đã xếp trong tuần cho mỗi nhân viên (cộng dồn khi xếp)
  const weeklyAssignCount = new Map<string, number>();
  employees.forEach(e => weeklyAssignCount.set(e.id, existingAutoCount.get(e.id) || 0));

  // Manual rows cũng chiếm chỗ trong ngày
  manualRows.forEach(s => {
    if (!assignedToday.has(s.date)) assignedToday.set(s.date, new Set());
    assignedToday.get(s.date)!.add(s.employeeId);
  });

  for (const date of dates) {
    for (const slot of shifts) {
      const shiftName = SHIFT_NAMES[slot];
      const capacity = getCapacityForDate(capacityOverrides, date, shiftName);

      // Manual rows đã chiếm slot này
      const manualInSlot = manualRows.filter(
        s => s.date === date && s.shiftName === shiftName
      ).length;

      const availableSlots = capacity - manualInSlot;

      if (availableSlots <= 0) {
        // Slot đã đủ (hoặc đầy) bởi manual rows
        slotResults.push({
          date,
          shiftName,
          assignedUsers: manualInSlot > 0 ? [] : [],
          capacity,
          isUnderstaffed: manualInSlot < capacity,
          missingCount: Math.max(0, capacity - manualInSlot),
        });
        continue;
      }

      // Lọc nhân viên đủ điều kiện
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Thứ2..6=CN
      const tr = getShiftTimeRange(slot, 'part-time'); // will override per-emp

      const candidates = employees.filter(emp => {
        const reg = regMap.get(emp.id);
        const study = studyMap.get(emp.id);

        // 1. Đăng ký "có thể làm" ngày này
        if (!reg) return false;
        const dayReg = reg.days.find(d => d.date === date);
        if (!dayReg) return false;
        if (dayReg.shift === 'off') return false;
        if (dayReg.type === 'leave') return false;

        // 2. Không chồng giờ: đã xếp ca nào khác trong ngày này chưa
        const dayAssigned = assignedToday.get(date);
        if (dayAssigned?.has(emp.id)) return false;

        // 3. Không trùng lịch học
        const empTr = getShiftTimeRange(slot, emp.employmentType);
        if (hasStudyConflict(study, adjustedDayOfWeek, empTr.start, empTr.end)) return false;

        return true;
      });

      // Sắp xếp theo ưu tiên: ít ca nhất trong tuần → ưu tiên trước
      candidates.sort((a, b) => {
        const countA = weeklyAssignCount.get(a.id) || 0;
        const countB = weeklyAssignCount.get(b.id) || 0;
        if (countA !== countB) return countA - countB;
        // Nếu bằng nhau → giữ nguyên thứ tự (first-come)
        return 0;
      });

      // Chọn từ đầu danh sách cho đến khi đủ capacity
      const selected = candidates.slice(0, availableSlots);

      // Ghi nhận kết quả
      const assignedIds: string[] = [];
      for (const emp of selected) {
        const empTr = getShiftTimeRange(slot, emp.employmentType);
        allPlaced.push({
          id: `batch-auto-${emp.id}-${date}-${slot}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeAvatar: emp.avatar,
          date,
          shiftName,
          startTime: empTr.start,
          endTime: empTr.end,
          status: 'scheduled',
          origin: 'auto',
        });
        assignedIds.push(emp.id);
        weeklyAssignCount.set(emp.id, (weeklyAssignCount.get(emp.id) || 0) + 1);

        if (!assignedToday.has(date)) assignedToday.set(date, new Set());
        assignedToday.get(date)!.add(emp.id);
      }

      const missingCount = Math.max(0, availableSlots - selected.length);
      slotResults.push({
        date,
        shiftName,
        assignedUsers: assignedIds,
        capacity,
        isUnderstaffed: missingCount > 0,
        missingCount,
      });
    }
  }

  // ── Bước 5: Ghép kết quả ──
  const understaffedWarnings = slotResults.filter(s => s.isUnderstaffed);
  const filledSlots = slotResults.filter(s => !s.isUnderstaffed).length;

  return {
    shifts: [...existingShifts.filter(s => s.origin === 'manual' || s.status === 'cancelled'), ...allPlaced],
    slotResults,
    understaffedWarnings,
    summary: {
      totalSlots: slotResults.length,
      filledSlots,
      understaffedSlots: understaffedWarnings.length,
      totalAssigned: allPlaced.length,
      totalRequested: employees.length * 7 * 3, // theoretical max
    },
  };
}
