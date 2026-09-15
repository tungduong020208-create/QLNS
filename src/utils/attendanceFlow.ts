/**
 * attendanceFlow — the attendance STATE MACHINES, pure and testable.
 *
 * This is the third layer of the CheckInCheckOut split:
 *   1. attendanceGate.ts   → "may this attempt proceed?"    (rules, pure)
 *   2. attendanceStore.ts  → "where does it get persisted?"  (storage contract, pure)
 *   3. attendanceFlow.ts   → "what does the UI show next?"   (state machine, pure)  ← this file
 * The component itself keeps ONLY presentation and event→dispatch wiring.
 *
 * WHY reducers instead of 20 individual useState calls: the old component had
 * ~18 `useState` + 3 effects silently syncing each other (handleClose alone
 * reset 11 fields — and that reset could drift out of sync with new states,
 * the classic source of "modal left in a weird state" bugs). A reducer makes
 * every transition EXPLICIT and one function — `sessionReducer` + `flowReducer`
 * — covers every combination. Both are pure (state, action) → state with no
 * side effects, so the whole flow is unit-testable without a browser.
 *
 * Both reducers never throw on unknown input: the "no-op" fallback is
 * deliberate — a stale event after unmount, or a message from an unexpected
 * state, must never crash attendance.
 */

import { CheckInRecord, CheckInMethod } from '../types';
import {
  CheckInSession,
  appendEmployeeRecord,
  clearActiveSession,
  KeyValueStore,
  saveActiveSession,
} from './attendanceStore';

// ═══════════════════════════ 1. SESSION STATE MACHINE ════════════════════════

/** Data captured from a completed check-in (start or end). */
export interface CapturedAttendance {
  type: 'checkin' | 'checkout';
  method: CheckInMethod;
  record: CheckInRecord;
}

/**
 * What the component renders for the "Đã check-in lúc ..." card and the
 * check-out button. Previously 4 separate useState + a readSession() initializer.
 */
export interface AttendanceSessionState {
  status: 'off' | 'on';
  checkInTime: string | null;
  checkInTimestamp: number | null;
  checkInMethod: CheckInMethod | null;
  /** Populated on checkout — the "Tổng giờ làm" summary. */
  workHoursSummary: { hours: string; duration: string } | null;
  lastRecord: CheckInRecord | null;
}

export const initialSessionState: AttendanceSessionState = {
  status: 'off',
  checkInTime: null,
  checkInTimestamp: null,
  checkInMethod: null,
  workHoursSummary: null,
  lastRecord: null,
};

/**
 * Derives the work-hours summary for a checkout. Exported separately so the
 * duration math is testable without running the reducer.
 */
export function summarizeWorkHours(
  checkInTimestamp: number | null,
  checkoutTimestamp: number
): { hours: string; duration: string } | null {
  if (checkInTimestamp == null || checkoutTimestamp < checkInTimestamp) return null;
  const diffMs = checkoutTimestamp - checkInTimestamp;
  const diffHours = diffMs / (1000 * 60 * 60);
  const hours = Math.floor(diffHours);
  const minutes = Math.floor((diffHours - hours) * 60);
  return {
    hours: diffHours.toFixed(1),
    duration: hours > 0 ? `${hours} tiếng ${minutes} phút` : `${minutes} phút`,
  };
}

export type AttendanceSessionAction =
  | { type: 'attendance-captured'; capture: CapturedAttendance }
  | { type: 'session-cleared' };

/**
 * PURE session transition on a COMPLETED capture (photo/PIN/GPS succeeded).
 *
 * IMPORTANT: this reducer deliberately performs NO persistence. React may
 * invoke a reducer twice in dev (StrictMode) and may replay actions during
 * concurrent rendering — any store write inside it would double-append
 * records. Persistence (saveActiveSession/clearActiveSession/
 * appendEmployeeRecord) is done ONCE by the component's event handler; this
 * reducer only mirrors the same transition into render state.
 */
export function sessionReducer(
  state: AttendanceSessionState,
  action: AttendanceSessionAction
): AttendanceSessionState {
  switch (action.type) {
    case 'attendance-captured': {
      const { record, type, method } = action.capture;
      if (type === 'checkin') {
        return {
          status: 'on',
          checkInTime: record.time,
          checkInTimestamp: record.timestamp,
          checkInMethod: method,
          workHoursSummary: null,
          lastRecord: record,
        };
      }
      // checkout
      return {
        status: 'off',
        checkInTime: null,
        checkInTimestamp: null,
        checkInMethod: null,
        workHoursSummary: summarizeWorkHours(state.checkInTimestamp, record.timestamp),
        lastRecord: record,
      };
    }
    case 'session-cleared':
      return initialSessionState;
    default:
      return state;
  }
}

/** React reducer alias for useReducer(sessionReducer, ...). */
export const attendanceSessionReducer = sessionReducer;

/**
 * Lazy useReducer initializer: rebuilds render state from the persisted
 * session row (survives reload while checked-in). Null/foreign session →
 * the clean "off" state.
 */
export function deriveInitialSessionState(
  stored: CheckInSession | null
): AttendanceSessionState {
  if (!stored) return initialSessionState;
  return {
    status: 'on',
    checkInTime: stored.checkInTime,
    checkInTimestamp: stored.checkInTimestamp,
    checkInMethod: stored.checkInMethod,
    workHoursSummary: null,
    lastRecord: null,
  };
}

// ═══════════════════════════ 2. FLOW STATE MACHINE ═══════════════════════════

/** Every screen/overlay the flow can be in. One source of truth for the UI. */
/** IP details shown in the hard-block modal (from the Wi-Fi check result). */
export interface WifiSnapshot {
  publicIP: string | null;
  localIP: string | null;
  publicIPValid: boolean;
  localIPValid: boolean;
}

export type AttendanceFlowState =
  /** Main card, no modal open. */
  | { view: 'idle' }
  /** Wi-Fi/GPS checks are running (loading overlay). */
  | { view: 'checking' }
  /** Gate blocked: Wi-Fi invalid and no fallback → hard-block modal. */
  | { view: 'wifi-blocked'; message: string; wifi: WifiSnapshot | null }
  /** Gate blocked: GPS unavailable (no position at all). */
  | { view: 'gps-unavailable'; message: string }
  /** Gate blocked: GPS too far while Wi-Fi valid (anti-spoof). */
  | { view: 'gps-too-far'; message: string; distance: number }
  /** Gate passed via fallback → choose GPS vs PIN. */
  | { view: 'fallback-select' }
  /** Camera permission prompt. */
  | { view: 'permission' }
  /** SmileDetector camera is open. */
  | { view: 'camera' }
  /** Photo captured, awaiting confirm/retake. */
  | { view: 'review'; photo: string }
  /** Record persisted successfully. */
  | { view: 'success' }
  /** GPS fallback is locating/verifying. */
  | { view: 'gps-locate'; phase: 'loading' | 'success' | 'error'; message?: string; distance?: number }
  /** PIN fallback entry. Lock/attempts live in `pinReducer`; only typing lives here. */
  | { view: 'pin'; input: string; error: string | null };

export type AttendanceFlowAction =
  | { type: 'attempt'; action: 'checkin' | 'checkout' }
  | { type: 'gate-verdict'; verdict: 'pass' | 'wifi-blocked' | 'fallback' | 'gps-unavailable' | 'gps-too-far'; message?: string; distance?: number; wifi?: WifiSnapshot | null }
  | { type: 'camera-allowed' }
  | { type: 'camera-denied' }
  | { type: 'smile-captured'; photo: string }
  | { type: 'retake' }
  | { type: 'confirmed' }
  | { type: 'fallback-gps' }
  | { type: 'fallback-pin' }
  | { type: 'gps-locate-phase'; phase: 'loading' | 'success' | 'error'; message?: string; distance?: number }
  | { type: 'pin-typing'; value: string }
  | { type: 'pin-error'; message: string }
  /** "Dùng phương án dự phòng" — from the main card or a failed camera. */
  | { type: 'open-fallback' }
  | { type: 'close' };

export interface PinState {
  locked: boolean;
  attempts: number;
  lockTimer: number;
}

/**
 * PIN lock state machine (pure slice): attempts + the 5-minute lockout.
 * Kept separate because the lock COUNTDOWN is a component-level timer concern
 * (it needs a tick effect), but the transition rules belong here, testable.
 */
export function pinReducer(state: PinState, action: { type: 'wrong-attempt' | 'lock' | 'tick' | 'reset' }): PinState {
  switch (action.type) {
    case 'wrong-attempt':
      return { ...state, attempts: state.attempts + 1 };
    case 'lock':
      return { ...state, locked: true, lockTimer: 300 };
    case 'tick': {
      if (!state.locked) return state;
      const next = state.lockTimer - 1;
      return next <= 0 ? { locked: false, attempts: 0, lockTimer: 0 } : { ...state, lockTimer: next };
    }
    case 'reset':
      return { locked: false, attempts: 0, lockTimer: 0 };
    default:
      return state;
  }
}

const idle: AttendanceFlowState = { view: 'idle' };

/** React reducer alias for the modal-flow machine. */
export const attendanceFlowReducer = flowReducer;

/**
 * The modal-flow machine. `checking` is the synchronous-async boundary: the
 * component dispatches `checks-started` right before awaiting the parallel
 * Wi-Fi/GPS checks, then translates resolveAttendanceGate's verdict into a
 * `gate-verdict` action. Every `close` returns to a CLEAN idle.
 */
export function flowReducer(state: AttendanceFlowState, action: AttendanceFlowAction): AttendanceFlowState {
  switch (action.type) {
    case 'attempt':
      // Restarting an attempt always starts from a clean checks state.
      return { view: 'checking' };

    case 'gate-verdict':
      if (state.view !== 'checking') return state; // stale verdict — ignore
      switch (action.verdict) {
        case 'pass':
          return { view: 'permission' };
        case 'fallback':
          return { view: 'fallback-select' };
        case 'wifi-blocked':
          return { view: 'wifi-blocked', message: action.message ?? '', wifi: action.wifi ?? null };
        case 'gps-unavailable':
          return { view: 'gps-unavailable', message: action.message ?? '' };
        case 'gps-too-far':
          return { view: 'gps-too-far', message: action.message ?? '', distance: action.distance ?? 0 };
      }
      return state;

    case 'camera-allowed':
      return state.view === 'permission' ? { view: 'camera' } : state;

    case 'camera-denied':
      return state.view === 'permission' ? { view: 'fallback-select' } : state;

    case 'smile-captured':
      if (state.view !== 'camera' && state.view !== 'review') return state;
      return { view: 'review', photo: action.photo };

    case 'retake':
      return state.view === 'review' ? { view: 'camera' } : state;

    case 'confirmed':
      // Capture accepted for ALL methods (photo review, GPS fallback, PIN).
      // The persistence side effects happen in sessionReducer, not here.
      if (state.view !== 'review' && state.view !== 'gps-locate' && state.view !== 'pin') return state;
      return { view: 'success' };

    case 'fallback-gps':
      return state.view === 'fallback-select' ? { view: 'gps-locate', phase: 'loading' } : state;

    case 'fallback-pin':
      return state.view === 'fallback-select' ? { view: 'pin', input: '', error: null } : state;

    case 'gps-locate-phase': {
      if (state.view !== 'gps-locate') return state;
      return {
        view: 'gps-locate',
        phase: action.phase,
        message: action.message,
        distance: action.distance,
      };
    }

    case 'pin-typing':
      if (state.view !== 'pin') return state;
      return { ...state, input: action.value, error: null };

    case 'pin-error':
      if (state.view !== 'pin') return state;
      return { ...state, error: action.message };

    case 'open-fallback':
      return state.view === 'idle' || state.view === 'camera' ? { view: 'fallback-select' } : state;

    case 'close':
      return idle;

    default:
      return state;
  }
}

/**
 * Whitelist guard for PIN input: digits only, max 6. Previously inlined in
 * the onChange handler; now testable.
 */
export function sanitizePinInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

/** True when PIN attempt N should trigger the 5-minute lockout (3rd failure). */
export function shouldLockPin(attemptsAfterFailure: number): boolean {
  return attemptsAfterFailure >= 3;
}

export const initialPinState: PinState = { locked: false, attempts: 0, lockTimer: 0 };

/**
 * Extract the IP details the hard-block modal shows, from a Wi-Fi check
 * result. Structural parameter (no import of ipCheck) keeps this file pure.
 */
export function toWifiSnapshot(result: {
  publicIP: string | null;
  localIP: string | null;
  details?: { publicIPValid: boolean; localIPValid: boolean } | null;
}): WifiSnapshot {
  return {
    publicIP: result.publicIP,
    localIP: result.localIP,
    publicIPValid: !!result.details?.publicIPValid,
    localIPValid: !!result.details?.localIPValid,
  };
}
