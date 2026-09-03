/**
 * Shared schedule utility for checking employee shifts.
 * Used by both WorkSchedule and ReviewScreen (Bàn giao ca).
 */

// Helper: format date to YYYY-MM-DD using LOCAL time
export const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: check if a date string is a weekend
export const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Check if an employee has any shifts on a given date.
 * Based on the same logic as WorkSchedule: Mon-Fri have 2 shifts, weekends have none.
 */
export const employeeHasShiftOnDate = (dateStr: string): boolean => {
  if (isWeekend(dateStr)) return false;
  // Weekdays: employee always has shifts (morning + afternoon)
  return true;
};

/**
 * Get list of employee IDs who have shifts on the given date.
 * Since all employees follow the same schedule, this returns all employee IDs
 * if it's a weekday, or empty array if weekend.
 */
export const getEmployeeIdsWithShifts = (dateStr: string, allEmployeeIds: string[]): string[] => {
  if (isWeekend(dateStr)) return [];
  return allEmployeeIds;
};

/**
 * Filter a list of evidence items to only include those
 * whose employee has a shift on the given date.
 */
export const filterEvidenceBySchedule = <T extends { employeeId: string; dateString: string }>(
  items: T[],
  selectedDate: string
): T[] => {
  return items.filter((item) => {
    // Extract the date part from the dateString
    const itemDate = item.dateString.split('T')[0];
    return itemDate === selectedDate && !isWeekend(selectedDate);
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
