/**
 * Unit tests for the attendance business layer.
 *
 * Run: npx tsx scripts/test-attendance.ts
 * (no test framework — a ~40-line runner keeps the zero-dependency setup;
 * migrate to vitest later if the suite grows, the assertions stay the same)
 *
 * These tests are the point of the CheckInCheckOut split: the rules that used
 * to be buried inside a 1,369-line component can now FAIL LOUDLY here instead
 * of silently regressing in production.
 */

import {
  resolveAttendanceGate,
  isLateCheckIn,
  GateInput,
} from '../src/utils/attendanceGate';
import {
  KeyValueStore,
  hasActiveSession,
  readActiveSession,
  saveActiveSession,
  clearActiveSession,
  readEmployeeRecords,
  appendEmployeeRecord,
  readAllRecords,
  CheckInSession,
} from '../src/utils/attendanceStore';
import { IpCheckResult } from '../src/utils/ipCheck';
import { CheckInRecord } from '../src/types';

// ── tiny runner ──────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean): void {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(name);
  }
}

function eq(name: string, actual: unknown, expected: unknown): void {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(`${name} (got ${JSON.stringify(actual)})`, same);
}

// ── fixtures ────────────────────────────────────────────────────────────────
const wifi = (over: Partial<IpCheckResult> = {}): IpCheckResult => ({
  isValid: true,
  publicIP: '203.0.113.7',
  localIP: null,
  error: '',
  useFallback: false,
  details: { publicIPValid: true, localIPValid: false, publicIPUnknown: false },
  ...over,
});

const gps = (lat = 10.8, lon = 106.7): GateInput['gpsPosition'] => ({
  coords: { latitude: lat, longitude: lon, accuracy: 12 },
});

const RADIUS = 100;
const dist = (meters: number) => () => meters;

const gateBase = (over: Partial<GateInput> = {}): GateInput => ({
  wifi: wifi(),
  gpsPosition: gps(),
  gpsErrorMessage: null,
  officeRadiusMeters: RADIUS,
  distanceToOffice: dist(30),
  ...over,
});

// ═══════════════════════════════ resolveAttendanceGate ═══════════════════════

// Wi-Fi gate
eq('wifi null → wifi-invalid', resolveAttendanceGate(gateBase({ wifi: null })).verdict, 'wifi-invalid');
eq(
  'wifi invalid, no fallback → wifi-invalid',
  resolveAttendanceGate(gateBase({ wifi: wifi({ isValid: false, useFallback: false }) })).verdict,
  'wifi-invalid'
);
eq(
  'wifi invalid, fallback on → wifi-fallback',
  resolveAttendanceGate(gateBase({ wifi: wifi({ isValid: false, useFallback: true }) })).verdict,
  'wifi-fallback'
);

// GPS gate — REMOVED from the blocking path (product decision 2026-09-24):
// Wi-Fi is the only attendance signal; GPS never blocks and never prompts.
eq(
  'gps failed → still pass (GPS no longer blocks)',
  resolveAttendanceGate(gateBase({ gpsPosition: null })).verdict,
  'pass'
);
eq(
  'gps far away → still pass (Wi-Fi is the attendance signal)',
  resolveAttendanceGate(gateBase({ distanceToOffice: dist(500) })).verdict,
  'pass'
);
eq(
  'gps within radius → pass',
  resolveAttendanceGate(gateBase({ distanceToOffice: dist(30) })).verdict,
  'pass'
);

// ═══════════════════════════════ isLateCheckIn ═══════════════════════════════

// 'HH:MM' strings compare lexicographically == chronologically
const at = (h: number, m: number) => new Date(2026, 8, 15, h, m, 0).getTime();

eq('off day (no shifts) → never late', isLateCheckIn({ checkInTimestamp: at(9, 0), shiftStartTimes: [], checkInTime: at(9, 0) }), false);
eq('exactly at shift start → not late', isLateCheckIn({ checkInTimestamp: at(6, 30), shiftStartTimes: ['06:30'], checkInTime: at(6, 30) }), false);
eq('1 minute after start → late', isLateCheckIn({ checkInTimestamp: at(6, 31), shiftStartTimes: ['06:30'], checkInTime: at(6, 31) }), true);
eq('early arrival → not late', isLateCheckIn({ checkInTimestamp: at(6, 15), shiftStartTimes: ['06:30'], checkInTime: at(6, 15) }), false);
// The earliest shift defines the bar: 10:00 is late for a 06:30 start even
// though it would be early for an 11:30 one.
eq(
  'earliest of multiple shifts is the bar',
  isLateCheckIn({ checkInTimestamp: at(10, 0), shiftStartTimes: ['11:30', '06:30'], checkInTime: at(10, 0) }),
  true
);
// Multi-digit hour sanity ('9:05' vs '06:30' — string sort would misorder
// unpadded times, so the rule documents the padded-HH:MM precondition here)
eq('padded hours required (precondition)', isLateCheckIn({ checkInTimestamp: at(6, 15), shiftStartTimes: ['06:30'], checkInTime: at(6, 15) }), false);

// ═══════════════════════════════ attendanceStore ═════════════════════════════

function makeMockStore(): KeyValueStore {
  const m = new Map<string, string | null>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const SESSION_KEY = 'test_session';
const RECORDS_KEY = 'test_records';

const mkSession = (employeeId: string): CheckInSession => ({
  employeeId,
  hasCheckedIn: true,
  checkInTime: '06:30:00',
  checkInTimestamp: at(6, 30),
  checkInMethod: 'photo',
  address: 'Office',
});

const mkRecord = (id: string): CheckInRecord =>
  ({
    id,
    type: 'checkin',
    time: '06:30:00',
    address: 'Office',
    photo: '',
    smileDetected: false,
    timestamp: at(6, 30),
    checkInMethod: 'gps',
  }) as CheckInRecord;

// session lifecycle
const s1 = makeMockStore();
eq('empty store → no active session', hasActiveSession(s1, SESSION_KEY, 'emp-1'), false);
saveActiveSession(s1, SESSION_KEY, mkSession('emp-1'));
eq('saved session → active for owner', hasActiveSession(s1, SESSION_KEY, 'emp-1'), true);
eq('session is employee-scoped', hasActiveSession(s1, SESSION_KEY, 'emp-2'), false);
eq('readActiveSession returns the row', readActiveSession(s1, SESSION_KEY, 'emp-1')?.employeeId, 'emp-1');
eq('readActiveSession null for others', readActiveSession(s1, SESSION_KEY, 'emp-2'), null);
clearActiveSession(s1, SESSION_KEY);
eq('cleared session → inactive', hasActiveSession(s1, SESSION_KEY, 'emp-1'), false);

// records: append, order, per-employee isolation
const s2 = makeMockStore();
appendEmployeeRecord(s2, RECORDS_KEY, 'emp-1', mkRecord('r1'));
appendEmployeeRecord(s2, RECORDS_KEY, 'emp-2', mkRecord('r2-other'));
appendEmployeeRecord(s2, RECORDS_KEY, 'emp-1', mkRecord('r3'));
eq('records kept in append order', readEmployeeRecords(s2, RECORDS_KEY, 'emp-1').map(r => r.id), ['r1', 'r3']);
eq('per-employee isolation', readEmployeeRecords(s2, RECORDS_KEY, 'emp-2').map(r => r.id), ['r2-other']);
eq('other employees untouched in raw map', Object.keys(readAllRecords(s2, RECORDS_KEY)).sort(), ['emp-1', 'emp-2']);

// resilience: corrupted JSON must not throw
const s3 = makeMockStore();
s3.setItem(RECORDS_KEY, '{not json');
eq('corrupted records → empty map', readAllRecords(s3, RECORDS_KEY), {});
s3.setItem(SESSION_KEY, 'garbage');
eq('corrupted session → no active session', hasActiveSession(s3, SESSION_KEY, 'emp-1'), false);

// ═══════════════════════════════ flowReducer (modal state machine) ════════════

import {
  flowReducer,
  initialPinState,
  sessionReducer,
  pinReducer,
  sanitizePinInput,
  shouldLockPin,
  summarizeWorkHours,
  deriveInitialSessionState,
  toWifiSnapshot,
  AttendanceFlowState,
} from '../src/utils/attendanceFlow';

const IDLE: AttendanceFlowState = { view: 'idle' };

// attempt → checking; verdicts only land while checking (stale verdicts ignored)
eq('attempt → checking', flowReducer(IDLE, { type: 'attempt', action: 'checkin' }), { view: 'checking' });
eq('verdict ignored when not checking', flowReducer(IDLE, { type: 'gate-verdict', verdict: 'pass' }), IDLE);
eq('gate pass → camera permission step (photo presence proof)',
  flowReducer({ view: 'checking' }, { type: 'gate-verdict', verdict: 'pass' }),
  { view: 'permission' });
eq('wifi-blocked carries wifi snapshot',
  flowReducer({ view: 'checking' }, { type: 'gate-verdict', verdict: 'wifi-blocked', message: 'x', wifi: { publicIP: '1.2.3.4', localIP: null, publicIPValid: false, localIPValid: false, publicIPUnknown: false } }),
  { view: 'wifi-blocked', message: 'x', wifi: { publicIP: '1.2.3.4', localIP: null, publicIPValid: false, localIPValid: false, publicIPUnknown: false }, canVerifyGps: false });
eq('fallback verdict → wifi-blocked with GPS available',
  flowReducer({ view: 'checking' }, { type: 'gate-verdict', verdict: 'fallback', message: 'x', wifi: null, canVerifyGps: true }),
  { view: 'wifi-blocked', message: 'x', wifi: null, canVerifyGps: true });
eq('gps-verify-start → loading', flowReducer(IDLE, { type: 'gps-verify-start' }), { view: 'gps-verify', phase: 'loading' });
eq('gps-verify-result error → error phase',
  flowReducer({ view: 'gps-verify', phase: 'loading' }, { type: 'gps-verify-result', ok: false, message: 'xa' }),
  { view: 'gps-verify', phase: 'error', message: 'xa' });
eq('fallback verdict → wifi-blocked with GPS',
  flowReducer({ view: 'checking' }, { type: 'gate-verdict', verdict: 'fallback' }),
  { view: 'wifi-blocked', message: '', wifi: null, canVerifyGps: true });

// camera path (restored 2026-09-24: Wi-Fi gate → permission → capture → review)
eq('camera-allowed', flowReducer({ view: 'permission' }, { type: 'camera-allowed' }), { view: 'camera' });
eq('camera-denied → fallback-select', flowReducer({ view: 'permission' }, { type: 'camera-denied' }), { view: 'fallback-select' });
eq('photo-captured → review', flowReducer({ view: 'camera' }, { type: 'photo-captured', photo: 'data:' }), { view: 'review', photo: 'data:' });
eq('retake → camera', flowReducer({ view: 'review', photo: 'p' }, { type: 'retake' }), { view: 'camera' });
eq('confirmed from review → success', flowReducer({ view: 'review', photo: 'p' }, { type: 'confirmed' }), { view: 'success' });

// legacy one-tap confirm (superseded by the camera flow, reducer compat)
eq('confirmed from confirm → success', flowReducer({ view: 'confirm' }, { type: 'confirmed' }), { view: 'success' });

// gps fallback path: select → locate → success beats → confirmed
check('fallback-gps → gps-locate loading',
  JSON.stringify(flowReducer({ view: 'fallback-select' }, { type: 'fallback-gps' })).includes('"phase":"loading"'));
check('gps success phase keeps distance',
  JSON.stringify(flowReducer({ view: 'gps-locate', phase: 'loading' }, { type: 'gps-locate-phase', phase: 'success', distance: 42 })).includes('"distance":42'));
eq('confirmed from gps-locate → success', flowReducer({ view: 'gps-locate', phase: 'success' }, { type: 'confirmed' }), { view: 'success' });

// pin path + typing guard
eq('fallback-pin → pin',
  flowReducer({ view: 'fallback-select' }, { type: 'fallback-pin' }),
  { view: 'pin', input: '', error: null });
eq('pin-typing clears error',
  flowReducer({ view: 'pin', input: '', error: 'e' }, { type: 'pin-typing', value: '1' }),
  { view: 'pin', input: '1', error: null });
eq('sanitizePinInput strips non-digits', sanitizePinInput('a1b2c3d4e5f6g7'), '123456');

// close always resets to a CLEAN idle
eq('close from pin → clean idle', flowReducer({ view: 'pin', input: '123456', error: null }, { type: 'close' }), IDLE);
eq('close from success → clean idle', flowReducer({ view: 'success' }, { type: 'close' }), IDLE);

// open-fallback allowed only from idle/camera
eq('open-fallback from idle', flowReducer(IDLE, { type: 'open-fallback' }), { view: 'fallback-select' });
eq('open-fallback blocked from wifi-blocked', flowReducer({ view: 'wifi-blocked', message: '', wifi: null }, { type: 'open-fallback' }).view, 'wifi-blocked');

// pinReducer: lock at 3rd failure, tick down, auto-unlock at 0
eq('shouldLockPin at 3', shouldLockPin(3), true);
eq('shouldLockPin not at 2', shouldLockPin(2), false);
const lockedPin = pinReducer(pinReducer(pinReducer(pinReducer(initialPinState, { type: 'wrong-attempt' }), { type: 'wrong-attempt' }), { type: 'wrong-attempt' }), { type: 'lock' });
eq('3 wrong attempts + lock', { locked: lockedPin.locked, timer: lockedPin.lockTimer }, { locked: true, timer: 300 });
eq('tick at 1 → unlocked', pinReducer({ locked: true, attempts: 3, lockTimer: 1 }, { type: 'tick' }), { locked: false, attempts: 0, lockTimer: 0 });

// sessionReducer: pure transitions (no writes — safe under StrictMode double-invoke)
const rec = (timestamp: number, time: string): CheckInRecord => ({
  id: 'r' + timestamp, type: 'checkin', time, address: 'a', photo: '',
  smileDetected: false, timestamp, checkInMethod: 'pin',
});
const offSession = { status: 'off' as const, checkInTime: null, checkInTimestamp: null, checkInMethod: null, workHoursSummary: null, lastRecord: null };
const onSession = sessionReducer(offSession, { type: 'attendance-captured', capture: { type: 'checkin', method: 'pin', record: rec(1000, '08:00') } });
eq('capture checkin → status on', onSession.status, 'on');
eq('running the same action twice is idempotent (StrictMode safe)', sessionReducer(onSession, { type: 'attendance-captured', capture: { type: 'checkin', method: 'pin', record: rec(1000, '08:00') } }).status, 'on');
const outSession = sessionReducer(onSession, { type: 'attendance-captured', capture: { type: 'checkout', method: 'pin', record: { ...rec(1000 + 5400 * 1000, '09:30'), type: 'checkout' } } });
eq('capture checkout → status off', outSession.status, 'off');
eq('work-hours summary 1.5h', outSession.workHoursSummary, { hours: '1.5', duration: '1 tiếng 30 phút' });
eq('checkout before checkin → null summary',
  sessionReducer(onSession, { type: 'attendance-captured', capture: { type: 'checkout', method: 'pin', record: { ...rec(500, 'x'), type: 'checkout' } } }).workHoursSummary,
  null);
eq('summarizeWorkHours < 1h shows minutes', summarizeWorkHours(1000, 1000 + 125 * 1000), { hours: '0.0', duration: '2 phút' });

eq('deriveInitialSessionState(null) → off', deriveInitialSessionState(null), offSession);
eq('deriveInitialSessionState restores on-state',
  deriveInitialSessionState({ employeeId: 'e1', hasCheckedIn: true, checkInTime: '08:00', checkInTimestamp: 1000, checkInMethod: 'gps', address: 'a' }).status,
  'on');

eq('toWifiSnapshot reads details safely', toWifiSnapshot({ publicIP: 'p', localIP: null, details: null }), { publicIP: 'p', localIP: null, publicIPValid: false, localIPValid: false, publicIPUnknown: false });

// ═══════════════════════════════ summary ═════════════════════════════════════
console.log(`\nAttendance rules: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error('FAILED:');
  failures.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
