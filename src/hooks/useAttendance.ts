/**
 * useAttendance — check-in/check-out work-hours records.
 *
 * Owns: STORAGE_KEY_CHECKINOUT_RECORDS ('aiicafe_checkinout_records')
 * Note this is the WorkHours pipeline (records WITH userId/date/hoursWorked),
 * distinct from the CheckInRecord pipeline in STORAGE_KEY_ATTENDANCE_RECORDS
 * which the dashboard/exports read. Both get written on check-in/out.
 */

import { useEffect, useState } from 'react';
import { CheckInOutRecord } from '../types';
import { STORAGE_KEY_CHECKINOUT_RECORDS } from '../utils/constants';
import { safeParse } from './usePersistentState';

function readRecords(): CheckInOutRecord[] {
  return safeParse<CheckInOutRecord[]>(STORAGE_KEY_CHECKINOUT_RECORDS, []);
}

export function useAttendance() {
  // Deliberately NOT usePersistentState: that hook's auto-save effect would
  // fight the cross-tab resync below (effect overwrites what the storage
  // listener just read, risking loops and lost writes). This state is
  // read-only-from-storage + explicitly written by addCheckIn/addCheckOut.
  const [checkInOutRecords, setCheckInOutRecords] = useState<CheckInOutRecord[]>(readRecords);

  // Same-device sync (mirrors ManagerDashboard): the browser `storage` event
  // fires in every OTHER tab when a tab writes localStorage — so work-hours
  // state refreshes when an employee checks in on another tab. A 30s poll +
  // window focus handler cover missed events and stale tabs.
  // (Cross-DEVICE sync still requires a shared backend — see docs/backend-plan.md)
  useEffect(() => {
    const resync = () => setCheckInOutRecords(readRecords());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY_CHECKINOUT_RECORDS) resync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', resync);
    const pollTimer = setInterval(resync, 30 * 1000);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', resync);
      clearInterval(pollTimer);
    };
  }, []);

  /** Persist then mirror into state — explicit write, no hidden effect. */
  const persist = (updater: (prev: CheckInOutRecord[]) => CheckInOutRecord[]) => {
    setCheckInOutRecords(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY_CHECKINOUT_RECORDS, JSON.stringify(next));
      } catch { /* storage full — in-memory only */ }
      return next;
    });
  };

  /** Append an open record (check-in, no checkOutTime yet). */
  const addCheckIn = (userId: string) => {
    persist(prev => [
      ...prev,
      {
        id: `ci-${Date.now()}`,
        userId,
        date: new Date().toISOString().split('T')[0],
        checkInTime: new Date().toISOString(),
      },
    ]);
  };

  /**
   * Close the most recent open record for this user today.
   * Safe no-op when there is nothing to close.
   */
  const addCheckOut = (userId: string) => {
    persist(prev => {
      // findLastIndex (ES2023): scan from the end — the LAST open record is
      // the one this check-out belongs to. Hand-rolled reverse loop keeps the
      // same semantics without relying on the tsconfig lib.
      let lastCheckInIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        const r = prev[i];
        if (r.userId === userId && r.date === new Date().toISOString().split('T')[0] && !r.checkOutTime) {
          lastCheckInIndex = i;
          break;
        }
      }
      if (lastCheckInIndex === -1) return prev;

      const now = new Date();
      const updated = [...prev];
      const checkInTime = new Date(updated[lastCheckInIndex].checkInTime);
      const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      updated[lastCheckInIndex] = {
        ...updated[lastCheckInIndex],
        checkOutTime: now.toISOString(),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
      };
      return updated;
    });
  };

  return { checkInOutRecords, addCheckIn, addCheckOut };
}
