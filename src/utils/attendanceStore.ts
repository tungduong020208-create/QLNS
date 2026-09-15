/**
 * attendanceStore — the ONLY place that knows how check-in data is persisted.
 *
 * WHY: `createRecord` used to inline this logic inside the giant component —
 * the reason the dashboard previously read a DIFFERENT key than the component
 * wrote (the exact class of bug the unified-data refactor fixed). Centralizing
 * read+write in one module makes the storage contract explicit:
 *
 *   aiicafe_checkin_session    → one row: the ACTIVE check-in session (per device)
 *   aiicafe_checkinout_records → { [employeeId]: CheckInRecord[] } full history
 *
 * Every helper takes the storage object as a parameter (DI) so they run in
 * Node without any browser, and can be tested with a plain Map-based mock.
 */

import { CheckInRecord, CheckInMethod } from '../types';
import { STORAGE_KEY_CHECKIN_SESSION, STORAGE_KEY_ATTENDANCE_RECORDS } from './constants';

export interface CheckInSession {
  employeeId: string;
  hasCheckedIn: boolean;
  checkInTime: string;
  checkInTimestamp: number;
  checkInMethod: CheckInMethod;
  address: string;
}

/** Minimal storage surface needed here (subset of the DOM localStorage API). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** True when the saved session belongs to this employee and is active. */
export function hasActiveSession(
  store: KeyValueStore,
  sessionKey: string,
  employeeId: string
): boolean {
  const raw = store.getItem(sessionKey);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw) as CheckInSession;
    return !!session && session.employeeId === employeeId && session.hasCheckedIn === true;
  } catch {
    return false;
  }
}

/** Read the active session row for this employee, or null. */
export function readActiveSession(
  store: KeyValueStore,
  sessionKey: string,
  employeeId: string
): CheckInSession | null {
  if (!hasActiveSession(store, sessionKey, employeeId)) return null;
  return JSON.parse(store.getItem(sessionKey)!) as CheckInSession;
}

/** Write the session row when a check-in starts. */
export function saveActiveSession(
  store: KeyValueStore,
  sessionKey: string,
  session: CheckInSession
): void {
  store.setItem(sessionKey, JSON.stringify(session));
}

/** Clear the session row when the employee checks out. */
export function clearActiveSession(store: KeyValueStore, sessionKey: string): void {
  store.removeItem(sessionKey);
}

/** Read the whole records map. Corrupted JSON → empty map, never throws. */
export function readAllRecords(
  store: KeyValueStore,
  recordsKey: string
): Record<string, CheckInRecord[]> {
  const raw = store.getItem(recordsKey);
  if (!raw) return {};
  try {
    const all = JSON.parse(raw) as Record<string, CheckInRecord[]>;
    return all && typeof all === 'object' ? all : {};
  } catch {
    return {};
  }
}

/** Write the whole records map. Never throws. */
export function writeAllRecords(
  store: KeyValueStore,
  recordsKey: string,
  all: Record<string, CheckInRecord[]>
): void {
  try {
    store.setItem(recordsKey, JSON.stringify(all));
  } catch {
    // Storage full — caller decides UX; attendance continues in memory only.
  }
}

/** Read the full record history for one employee. */
export function readEmployeeRecords(
  store: KeyValueStore,
  recordsKey: string,
  employeeId: string
): CheckInRecord[] {
  const all = readAllRecords(store, recordsKey);
  return Array.isArray(all[employeeId]) ? all[employeeId] : [];
}

/** Append one record to the per-employee history. Never throws. */
export function appendEmployeeRecord(
  store: KeyValueStore,
  recordsKey: string,
  employeeId: string,
  record: CheckInRecord
): void {
  const existing = readEmployeeRecords(store, recordsKey, employeeId);
  writeAllRecords(store, recordsKey, {
    ...readAllRecords(store, recordsKey),
    [employeeId]: [...existing, record],
  });
}

/**
 * Default bound helpers so call sites don't repeat the key constants.
 * Returns the same operations, pre-bound to the real localStorage keys.
 */
export function makeAttendanceStore(store: KeyValueStore) {
  return {
    hasActiveSession: (employeeId: string) =>
      hasActiveSession(store, STORAGE_KEY_CHECKIN_SESSION, employeeId),
    readActiveSession: (employeeId: string) =>
      readActiveSession(store, STORAGE_KEY_CHECKIN_SESSION, employeeId),
    saveActiveSession: (session: CheckInSession) =>
      saveActiveSession(store, STORAGE_KEY_CHECKIN_SESSION, session),
    clearActiveSession: () => clearActiveSession(store, STORAGE_KEY_CHECKIN_SESSION),
    readEmployeeRecords: (employeeId: string) =>
      readEmployeeRecords(store, STORAGE_KEY_ATTENDANCE_RECORDS, employeeId),
    appendEmployeeRecord: (employeeId: string, record: CheckInRecord) =>
      appendEmployeeRecord(store, STORAGE_KEY_ATTENDANCE_RECORDS, employeeId, record),
  };
}
