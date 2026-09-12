/**
 * Geofence monitoring — runs from check-in until check-out.
 *
 * Every checkIntervalMin minutes the employee device samples its GPS position
 * and computes the distance to the office. When the distance exceeds
 * alertRadiusM it:
 *   1. Appends a GeofenceEvent to the audit trail (localStorage)
 *   2. Calls the onOutOfRange callback so the app can notify the manager
 *   3. Re-alerts only after repeatAlertMin minutes if still out of range
 *      (anti-spam), tracking continuous out-of-range stretches.
 *
 * Monitoring starts only while a check-in session exists and stops
 * immediately when the session ends (check-out) — privacy requirement.
 *
 * The audit trail is shared via localStorage, so the manager dashboard can
 * read out-of-range status for ALL employees via getGeofenceStatus().
 */

import { useEffect } from 'react';
import { GeofenceEvent } from '../types';
import { getCurrentPosition, getDistanceToOffice } from '../utils/checkin';
import {
  STORAGE_KEY_CHECKIN_SESSION,
  STORAGE_KEY_GEOFENCE_EVENTS,
  GEOFENCE,
} from '../utils/constants';

/** Shape of the check-in session persisted by CheckInCheckOut.tsx */
interface CheckInSession {
  employeeId: string;
  hasCheckedIn: boolean;
  checkInTime: string;
  checkInTimestamp: number;
  checkInMethod: string;
  address: string;
}

const AUDIT_LOG_LIMIT = 200;

/** An employee counts as "currently out of range" if their latest event is this fresh */
const OUT_OF_RANGE_FRESHNESS_MS = GEOFENCE.repeatAlertMin * 60 * 1000;

export interface GeofenceStatus {
  /** Employees currently out of range (latest fresh event per employee) */
  outOfRange: Array<{
    employeeId: string;
    employeeName: string;
    since: string;            // ISO — when the out-of-range stretch started
    lastSeen: string;         // ISO — latest event time
    latitude: number;
    longitude: number;
    distanceMeters: number;
    repeatCount: number;
  }>;
  /** Most recent audit events (newest first) */
  recentEvents: GeofenceEvent[];
}

export function readGeofenceEvents(): GeofenceEvent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GEOFENCE_EVENTS);
    if (saved) return JSON.parse(saved) as GeofenceEvent[];
  } catch {
    // corrupted — fall through
  }
  return [];
}

function appendGeofenceEvent(event: GeofenceEvent): void {
  const events = readGeofenceEvents();
  events.unshift(event);
  try {
    localStorage.setItem(STORAGE_KEY_GEOFENCE_EVENTS, JSON.stringify(events.slice(0, AUDIT_LOG_LIMIT)));
  } catch {
    // storage full — drop silently, monitoring continues
  }
}

/** Build dashboard status from the shared audit trail (all employees). */
export function getGeofenceStatus(): GeofenceStatus {
  const events = readGeofenceEvents();
  const now = Date.now();

  const latestPerEmployee = new Map<string, GeofenceEvent>();
  for (const event of events) {
    const existing = latestPerEmployee.get(event.employeeId);
    if (!existing || new Date(existing.timestamp).getTime() < new Date(event.timestamp).getTime()) {
      latestPerEmployee.set(event.employeeId, event);
    }
  }

  const outOfRange = Array.from(latestPerEmployee.values())
    .filter(event => now - new Date(event.timestamp).getTime() <= OUT_OF_RANGE_FRESHNESS_MS)
    .map(event => {
      const employeeEvents = events.filter(e => e.employeeId === event.employeeId);
      const stretchStart = employeeEvents
        .filter(e => !e.isRepeat)
        .map(e => new Date(e.timestamp).getTime())
        .sort((a, b) => b - a)[0];
      return {
        employeeId: event.employeeId,
        employeeName: event.employeeName,
        since: new Date(stretchStart ?? new Date(event.timestamp).getTime()).toISOString(),
        lastSeen: event.timestamp,
        latitude: event.latitude,
        longitude: event.longitude,
        distanceMeters: event.distanceMeters,
        repeatCount: employeeEvents.filter(e => e.isRepeat).length,
      };
    })
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  return { outOfRange, recentEvents: events.slice(0, 20) };
}

/**
 * Runs the periodic geofence scan for the currently logged-in employee.
 * Mount once (in AuthenticatedLayout); it self-disables for managers,
 * logged-out state, and when there is no active check-in session.
 */
export function useGeofenceMonitor(
  currentUser: { id: string; name: string; role: string } | null,
  onOutOfRange: (event: GeofenceEvent) => void
): void {
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee') return;

    let cancelled = false;
    const onOutOfRangeRef = onOutOfRange;

    /** True while this employee has an active check-in session */
    const hasActiveSession = (): boolean => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CHECKIN_SESSION);
        if (!saved) return false;
        const session: CheckInSession = JSON.parse(saved);
        return session.employeeId === currentUser.id && session.hasCheckedIn;
      } catch {
        return false;
      }
    };

    const checkDistance = async () => {
      if (cancelled || !hasActiveSession()) return;

      try {
        const position = await getCurrentPosition();
        if (cancelled) return;
        const distance = Math.round(getDistanceToOffice(position.coords.latitude, position.coords.longitude));

        if (distance <= GEOFENCE.alertRadiusM) return; // back in range — nothing to do

        const now = Date.now();

        // Anti-spam: read the last alert for this employee from the audit log,
        // so repeat throttling survives page reloads. A new alert fires only
        // after repeatAlertMin minutes have elapsed since the previous one.
        const events = readGeofenceEvents();
        const lastEvent = events.find(e => e.employeeId === currentUser.id);
        const lastAlertAt = lastEvent ? new Date(lastEvent.timestamp).getTime() : 0;
        const minutesSinceLastAlert = (now - lastAlertAt) / 60000;
        if (lastAlertAt > 0 && minutesSinceLastAlert < GEOFENCE.repeatAlertMin) {
          return; // still within repeat window — no new alert
        }
        const isRepeat = lastAlertAt > 0;

        const event: GeofenceEvent = {
          id: `geo-${now}`,
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          timestamp: new Date(now).toISOString(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          distanceMeters: distance,
          thresholdMeters: GEOFENCE.alertRadiusM,
          isRepeat,
        };
        appendGeofenceEvent(event);
        onOutOfRangeRef(event);
      } catch {
        // GPS unavailable (permission, indoors…) — keep monitoring silently
      }
    };

    // Kick off immediately, then on the configured interval
    checkDistance();
    const intervalId = window.setInterval(checkDistance, GEOFENCE.checkIntervalMin * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);
}
