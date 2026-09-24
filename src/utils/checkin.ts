/**
 * Check-in utility functions for fallback mechanism
 */

import { CheckInLocation, StoreLocation } from '../types';

/**
 * Default store location (AiiCafe - Example)
 */
export const DEFAULT_STORE: StoreLocation = {
  id: 'store-1',
  name: 'AiiCafe - Quận 1',
  latitude: 10.7769,  // Ho Chi Minh City example
  longitude: 106.7009,
  radius: 100,        // 100 meters
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Distance from a coordinate to the office (DEFAULT_STORE) in meters.
 */
export function getDistanceToOffice(lat: number, lon: number): number {
  return haversineDistance(lat, lon, DEFAULT_STORE.latitude, DEFAULT_STORE.longitude);
}

/**
 * Whether a coordinate is within the office check-in radius (100m).
 */
export function isWithinOfficeRadius(lat: number, lon: number): { within: boolean; distance: number } {
  return isWithinStoreRadius(lat, lon);
}

/**
 * Check if current location is within store radius
 */
export function isWithinStoreRadius(
  currentLat: number,
  currentLon: number,
  store: StoreLocation = DEFAULT_STORE
): { within: boolean; distance: number } {
  const distance = haversineDistance(
    currentLat,
    currentLon,
    store.latitude,
    store.longitude
  );
  return {
    within: distance <= store.radius,
    distance: Math.round(distance),
  };
}

/**
 * Get current GPS position
 * @returns Promise with latitude and longitude
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

/**
 * True only when geolocation permission is ALREADY granted.
 *
 * Background callers (display hooks, geofence polling) must use this gate:
 * calling getCurrentPosition while the permission is in 'prompt' state makes
 * the host webview pop the "Allow geolocation?" dialog — and in embedded
 * webviews the answer isn't persisted, so it re-prompts endlessly. Only an
 * explicit user action (the check-in button) may trigger the prompt.
 */
export async function isGeolocationGranted(): Promise<boolean> {
  if (!('geolocation' in navigator)) return false;
  if (!navigator.permissions?.query) return true; // API unavailable — legacy behavior
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state === 'granted';
  } catch {
    return true; // query unsupported — legacy behavior
  }
}

/** Fine-grained geolocation permission state for the check-in flow. */
export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * Current geolocation permission state without triggering any prompt.
 *
 * The check-in flow uses this to short-circuit when permission is
 * definitively DENIED: calling getCurrentPosition then would fail instantly
 * with code 1 and add nothing but confusion (and in some webviews, a
 * duplicate permission dialog from the auto-retry).
 */
export async function getGeolocationState(): Promise<GeolocationPermissionState> {
  if (!('geolocation' in navigator)) return 'unsupported';
  if (!navigator.permissions?.query) return 'prompt';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeolocationPermissionState;
  } catch {
    return 'prompt';
  }
}

// Re-export secure PIN functions from auth.ts (derived secret, constant-time validation)
export { generateShiftPin, validateShiftPin } from './auth';

/**
 * Get current shift type based on time
 */
export function getCurrentShiftType(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get location error message in Vietnamese
 */
export function getLocationErrorMessage(error: GeolocationPositionError): string {
  // Match on numeric codes (1/2/3) rather than error.PERMISSION_DENIED-style
  // constants — wrapper objects may not carry the prototype constants.
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS trong cài đặt.';
    case 2: // POSITION_UNAVAILABLE
      return 'Không thể xác định vị trí. Vui lòng kiểm tra GPS.';
    case 3: // TIMEOUT
      return 'Hết thời gian lấy vị trí. Vui lòng thử lại.';
    default:
      return 'Lỗi xác định vị trí. Vui lòng thử lại.';
  }
}

/**
 * Get check-in method label in Vietnamese
 */
export function getCheckInMethodLabel(method: string): string {
  switch (method) {
    case 'wifi':
      return '📶 Wi-Fi quán';
    case 'photo':
      return '📸 Ảnh';
    case 'gps':
      return '📍 GPS';
    case 'pin':
      return '🔢 Mã PIN';
    case 'toggle':
      return '🔧 Nút gạt';
    default:
      return 'Không xác định';
  }
}

/**
 * Get check-in method color class
 */
export function getCheckInMethodColor(method: string): string {
  switch (method) {
    case 'wifi':
      return 'text-blue-600 bg-blue-50';
    case 'photo':
      return 'text-green-600 bg-green-50';
    case 'gps':
      return 'text-blue-600 bg-blue-50';
    case 'pin':
      return 'text-amber-600 bg-amber-50';
    case 'toggle':
      return 'text-teal-600 bg-teal-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
