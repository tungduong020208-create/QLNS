/**
 * autoSchedule — automatic shift placement engine.
 *
 * Business rule: the moment an employee saves a weekly registration, the
 * system places them into the OFFICIAL schedule (the unified shifts store)
 * without waiting for a manager. This module is the single decision-maker
 * for that flow; it is a PURE function (no React, no storage access) so it
 * can be unit-tested and later reused verbatim by a backend job.
 *
 * Rules, in order:
 *   1. Only non-'off' days are considered.
 *   2. The employee's previous AUTO rows for the same week are replaced
 *      (resubmission = new intent). The employee's MANUAL rows — placed by
 *      a manager — are NEVER touched: manual edits always win.
 *   3. KHUNG GIỜ tự map theo loại nhân viên (getShiftTimeRange):
 *      part-time 5–6h/ca, full-time 8h/ca. Nhân viên chỉ chọn NGÀY + CA —
 *      giờ là hệ quả của (ca, employmentType), không phải input.
 *   4. A requested shift is placed only if that (date, shiftName) still has
 *      free capacity. Capacity is PER (date, shift) — manager-adjustable —
 *      and first come, first served: whoever's registration was saved
 *      earlier already occupies the slots.
 *   5. Blocked placements are recorded as conflicts (date + shift) on the
 *      registration, which stays 'submitted' so the manager sees a pending
 *      item instead of the system silently dropping the request.
 *
 * RACE-CONDITION NOTE (mục 5 của nghiệp vụ): in this local-storage demo the
 * "save" is synchronous, so double-booking is impossible within one tab.
 * On the real backend the equivalent must be a single atomic insert guarded
 * by a capacity-count check inside one transaction (see
 * docs/backend-plan.md § shifts) — this function's signature is designed to
 * map 1:1 onto that RPC.
 */

import { ShiftSlot, WeeklyShiftRegistration, EmploymentType } from '../types';
import { Shift } from '../components/screens/ManagerScheduleScreen';
import { SHIFT_SLOT_TEMPLATES, getShiftTimeRange } from './constants';
import { getCapacityForDate } from '../hooks/useShiftCapacity';

export interface AutoScheduleConflict {
  date: string;
  shift: ShiftSlot;
}

export interface AutoScheduleResult {
  /** Complete new shifts array to persist in the unified store. */
  shifts: Shift[];
  /** How many requested days were successfully placed. */
  assignedCount: number;
  /** Requested days that could NOT be placed. */
  conflicts: AutoScheduleConflict[];
}

/** Build the row id used by the auto scheduler (stable + readable). */
export const autoShiftRowId = (userId: string, date: string, slot: ShiftSlot): string =>
  `shift-auto-${userId}-${date}-${slot}`;

/** True when the shift row was placed by a manager (kept on resubmission). */
export const isManualShift = (s: Shift): boolean => s.origin === 'manual';

/** Optional capacity resolver injected by the caller (per-date overrides). */
export type CapacityResolver = (date: string, shiftName: string) => number;

/**
 * Apply an employee's registration to the official schedule.
 *
 * @param reg                  The registration just saved by the employee.
 * @param allShifts            Current unified shifts store.
 * @param employeeName/avatar  Denormalized display fields on the Shift row.
 * @param employmentType       Loại hợp đồng — quyết định khung giờ ca
 *                             (bỏ trống → part-time, khớp getShiftTimeRange).
 * @param getCapacity          Per-(date, shift) max resolver (defaults +
 *                             manager overrides). Falls back to the
 *                             constants defaults when omitted.
 */
export function computeAutoSchedule(
  reg: WeeklyShiftRegistration,
  allShifts: Shift[],
  employeeName: string,
  employeeAvatar: string,
  employmentType?: EmploymentType,
  getCapacity?: CapacityResolver
): AutoScheduleResult {
  const weekEnd = new Date(reg.weekStart + 'T00:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Keep everything OUTSIDE this employee+week, plus this employee's MANUAL
  // rows inside the week (manual beats auto — see module doc).
  const untouched = allShifts.filter(
    (s) =>
      !(s.employeeId === reg.userId && s.date >= reg.weekStart && s.date <= weekEndStr) ||
      isManualShift(s)
  );

  // Manual rows of OTHER employees for the same week still count against
  // capacity — capacity is a property of the schedule, not of the writer.
  const sameWeek = allShifts.filter(
    (s) => s.date >= reg.weekStart && s.date <= weekEndStr && s.status !== 'cancelled'
  );

  const placed: Shift[] = [];
  const conflicts: AutoScheduleConflict[] = [];

  for (const day of reg.days) {
    if (day.shift === 'off') continue;

    // Duplicate guard: the employee already holds a non-cancelled shift
    // (any shift) on this date — a second request for the same day is
    // dropped rather than double-booked.
    const alreadyBooked = sameWeek.some(
      (s) => s.employeeId === reg.userId && s.date === day.date
    ) || placed.some((p) => p.date === day.date);
    if (alreadyBooked) {
      conflicts.push({ date: day.date, shift: day.shift });
      continue;
    }

    const template = SHIFT_SLOT_TEMPLATES[day.shift];
    if (!template) continue; // unknown slot — ignore defensively

    // Khung giờ theo LOẠI NHÂN VIÊN (mục 2 & 4): nhân viên chỉ chọn
    // ngày + ca; giờ là output của (ca, employmentType).
    const timeRange = getShiftTimeRange(day.shift, employmentType);

    // Capacity check (mục 3 & 5): count non-cancelled rows with the same
    // (date, shiftName) against that slot's per-date max.
    const max = getCapacity
      ? getCapacity(day.date, template.name)
      : getCapacityForDate([], day.date, template.name);
    const taken = sameWeek.filter(
      (s) => s.date === day.date && s.shiftName === template.name
    ).length + placed.filter(
      (p) => p.date === day.date && p.shiftName === template.name
    ).length;
    if (taken >= max) {
      conflicts.push({ date: day.date, shift: day.shift });
      continue;
    }

    placed.push({
      id: autoShiftRowId(reg.userId, day.date, day.shift),
      employeeId: reg.userId,
      employeeName,
      employeeAvatar,
      date: day.date,
      shiftName: template.name,
      startTime: timeRange.start,
      endTime: timeRange.end,
      status: 'scheduled',
      origin: 'auto',
    });
  }

  return {
    shifts: [...untouched, ...placed],
    assignedCount: placed.length,
    conflicts,
  };
}
