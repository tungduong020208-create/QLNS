/**
 * Shared schedule utility for checking employee shifts.
 * Used by both WorkSchedule and ReviewScreen (Bàn giao ca).
 */

import { Shift } from '../components/screens/ManagerScheduleScreen';
import { STORAGE_KEY_SHIFTS } from './constants';
import { safeParse } from '../hooks/usePersistentState';

// Helper: format date to YYYY-MM-DD using LOCAL time
export const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: format a Date to a LOCAL 'YYYY-MM-DDTHH:mm:ss' timestamp.
// toISOString() yields UTC, which in UTC+7 shifts posts created before 07:00
// to the previous calendar day — breaking the feed's selected-date filter.
export const toLocalDateTimeStr = (date: Date): string => {
  return `${toDateStr(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

// Helper: check if a date string is a weekend
export const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Check if an employee has any shifts on a given date.
 * DATA-DRIVEN: reads the unified shift store (STORAGE_KEY_SHIFTS) — the same
 * data the manager publishes and the employee sees. A Saturday or Sunday with
 * a published shift counts as a work day; a weekday with no shift does not.
 */
export const employeeHasShiftOnDate = (dateStr: string): boolean => {
  const shifts = safeParse<Shift[]>(STORAGE_KEY_SHIFTS, []);
  return shifts.some((s) => s.date === dateStr && s.status !== 'cancelled');
};

/**
 * Get list of employee IDs who have shifts on the given date.
 * Reads the unified shift store; falls back to the legacy hard-coded rule
 * (all employees work weekdays) only when the store is empty.
 */
export const getEmployeeIdsWithShifts = (dateStr: string, allEmployeeIds: string[]): string[] => {
  const shifts = safeParse<Shift[]>(STORAGE_KEY_SHIFTS, []);
  if (shifts.length > 0) {
    return allEmployeeIds.filter((id) =>
      shifts.some((s) => s.employeeId === id && s.date === dateStr && s.status !== 'cancelled')
    );
  }
  // Legacy fallback: Mon-Fri everyone works, weekends nobody does
  return isWeekend(dateStr) ? [] : allEmployeeIds;
};

/**
 * Filter a list of evidence items to only include those
 * whose date matches the selected date. Weekend no longer auto-excluded —
 * an evidence submitted on a Saturday with a scheduled shift still counts.
 */
export const filterEvidenceBySchedule = <T extends { employeeId: string; dateString: string }>(
  items: T[],
  selectedDate: string
): T[] => {
  return items.filter((item) => {
    // Extract the date part from the dateString
    const itemDate = item.dateString.split('T')[0];
    return itemDate === selectedDate;
  });
};

/**
 * Get the Monday of the week containing a given date.
 */
export const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the Sunday (YYYY-MM-DD) of the week that CONTAINS the given Monday.
 * Assumes `weekStart` is already a Monday — used to bound a published week
 * when replacing that week's shift rows in the unified shifts store.
 */
export const weekEndOf = (weekStart: string): string => {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
};
