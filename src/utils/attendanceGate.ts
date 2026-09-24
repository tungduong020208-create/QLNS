/**
 * attendanceGate — PURE business rules for check-in gating.
 *
 * WHY this module exists: these rules used to live inline inside a 1,369-line
 * component, interleaved with camera, storage and JSX. Attendance is the most
 * fraud-sensitive feature of the app — the rules must be (a) readable in one
 * place, (b) unit-testable without a browser, (c) reusable verbatim by the
 * future server-side implementation (Phase 4 in docs/backend-plan.md), where
 * the SAME decisions must be re-enforced on the server.
 *
 * HONEST TRUST-BOUNDARY NOTE: every verdict computed here is CLIENT-SIDE and
 * therefore advisory — an employee with DevTools can bypass any of it (there
 * is no cryptographic protection client-side). The future `record-checkin`
 * Edge Function re-runs resolveAttendanceGate() server-side against the RAW
 * GPS/IP of the incoming request; these client checks are UX + cost-saving
 * (reject before opening the camera), not the security boundary.
 *
 * Everything here is a pure function: no React, no storage, no network.
 */

import { IpCheckResult } from './ipCheck';

/** Minimal structural GPS position — decoupled from DOM GeolocationPosition. */
export interface GateGpsPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

/** What the gate decided — the component maps each verdict to its UI. */
export type GateOutcome =
  | { verdict: 'pass' }
  /** Wrong Wi-Fi/network and no fallback enabled → hard block. */
  | { verdict: 'wifi-invalid' }
  /** Wi-Fi invalid but fallback is enabled → offer GPS/PIN alternatives. */
  | { verdict: 'wifi-fallback' }
  /** GPS itself failed (permission denied, timeout, unavailable…). */
  | { verdict: 'gps-unavailable'; message: string }
  /** Wi-Fi valid but the device is physically too far — likely spoofed Wi-Fi/VPN. */
  | { verdict: 'gps-too-far'; distance: number; message: string };

export interface GateInput {
  /** Result of the Wi-Fi/IP check. Null = the check itself crashed. */
  wifi: IpCheckResult | null;
  /** GPS position, or null when GPS failed (see gpsErrorMessage). */
  gpsPosition: GateGpsPosition | null;
  /** Human-readable GPS failure reason when gpsPosition is null. */
  gpsErrorMessage: string | null;
  /** Office alert radius in meters (from DEFAULT_STORE in constants). */
  officeRadiusMeters: number;
  /** Distance calculator, injected so tests don't need real office coords. */
  distanceToOffice: (lat: number, lon: number) => number;
}

/**
 * Decide whether check-in may proceed. Order matters and is part of the spec:
 *
 * PRODUCT DESIGN (2026-09-24, v2 — "Wi-Fi first, GPS as fallback"):
 *  1. Wi-Fi/IP valid → PASS immediately. No GPS call, no permission dialog,
 *     zero friction for the 99% case (employee on the store Wi-Fi).
 *  2. Wi-Fi invalid (store Wi-Fi down, employee on mobile data, ISP changed
 *     the IP) → 'wifi-fallback': the component then ASKS the user to verify
 *     via GPS. Only this explicit user-initiated path may trigger the
 *     geolocation prompt — never a background call.
 *  3. The GPS verification itself is decided by `resolveGpsFallback()`:
 *     within the office radius → pass; outside → likely remote/spoof → block.
 */
export function resolveAttendanceGate(input: GateInput): GateOutcome {
  const { wifi } = input;

  // ── Wi-Fi gate (primary signal) ──
  if (!wifi || !wifi.isValid) {
    if (wifi && wifi.useFallback) return { verdict: 'wifi-fallback' };
    return { verdict: 'wifi-invalid' };
  }

  // Wi-Fi verified → one-tap pass. GPS position inputs are accepted for
  // interface stability but intentionally unused here (no prompt, no block).
  return { verdict: 'pass' };
}

/** Result of the user-initiated GPS fallback verification. */
export type GpsFallbackOutcome =
  | { verdict: 'pass'; distance: number }
  | { verdict: 'gps-too-far'; distance: number; message: string }
  | { verdict: 'gps-unavailable'; message: string };

/**
 * Decide the GPS fallback verification (runs ONLY when the employee explicitly
 * chooses GPS verification after a Wi-Fi failure).
 *
 * Radius buffer: GPS accuracy is added to the office radius so indoor drift
 * doesn't produce false "too far" blocks (an accuracy=50m fix could be up to
 * 50m off in any direction).
 */
export function resolveGpsFallback(input: {
  gpsPosition: GateGpsPosition | null;
  gpsErrorMessage: string | null;
  officeRadiusMeters: number;
  distanceToOffice: (lat: number, lon: number) => number;
}): GpsFallbackOutcome {
  const { gpsPosition, gpsErrorMessage, officeRadiusMeters, distanceToOffice } = input;

  if (!gpsPosition) {
    return {
      verdict: 'gps-unavailable',
      message: gpsErrorMessage || 'Không thể xác định vị trí GPS',
    };
  }

  const distance = Math.round(
    distanceToOffice(gpsPosition.coords.latitude, gpsPosition.coords.longitude)
  );
  const accuracyBuffer = gpsPosition.coords.accuracy ?? 0;
  const effectiveRadius = officeRadiusMeters + accuracyBuffer;

  if (distance > effectiveRadius) {
    return {
      verdict: 'gps-too-far',
      distance,
      message:
        `Bạn đang cách cửa hàng ${distance}m (giới hạn ${Math.round(effectiveRadius)}m). ` +
        'Hãy kết nối Wi-Fi của quán hoặc đến gần hơn để điểm danh.',
    };
  }

  return { verdict: 'pass', distance };
}

/**
 * Late-arrival rule: an employee is late when their check-in happens AFTER
 * the earliest scheduled shift start of that day.
 *
 * Semantics (shared with the manager dashboard metric — single source of truth):
 *  - No shifts that day → NOT late (an off day has no reference time to be late for).
 *  - Cancelled/swapped rows don't count as schedule.
 *  - 'HH:MM' strings sort correctly as text, so min() is a string sort.
 *  - Grace period is ZERO minutes: the record shows the exact times and the
 *    manager judges; the metric must not silently forgive.
 */
export function isLateCheckIn(params: {
  checkInTimestamp: number;
  /** All scheduled start times that day, 'HH:MM' — already filtered to valid rows. */
  shiftStartTimes: string[];
  /** The check-in moment as a Date-capable value (timestamp or ISO string). */
  checkInTime: number | string;
}): boolean {
  const { shiftStartTimes } = params;
  if (shiftStartTimes.length === 0) return false;

  const earliest = [...shiftStartTimes].sort()[0]; // 'HH:MM' lexicographic == chronological
  const [h, m] = earliest.split(':').map(Number);
  const t = new Date(params.checkInTime);
  return t.getHours() > h || (t.getHours() === h && t.getMinutes() > m);
}
