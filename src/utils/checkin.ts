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
 * Simple hash function for PIN generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate shift PIN based on date and shift type
 * @param date - Date string YYYY-MM-DD
 * @param shiftType - 'morning' | 'afternoon' | 'evening'
 * @param secret - Server-side secret key
 * @returns 6-digit PIN string
 */
export function generateShiftPin(
  date: string,
  shiftType: 'morning' | 'afternoon' | 'evening',
  secret: string = 'aiicafe-2024'
): string {
  const payload = `${date}-${shiftType}-${secret}`;
  const hash = simpleHash(payload);
  // Extract 6 digits from hash
  const pin = (parseInt(hash.substring(0, 8), 16) % 1000000)
    .toString()
    .padStart(6, '0');
  return pin;
}

/**
 * Validate shift PIN
 */
export function validateShiftPin(
  enteredPin: string,
  date: string,
  shiftType: 'morning' | 'afternoon' | 'evening',
  secret: string = 'aiicafe-2024'
): boolean {
  const expectedPin = generateShiftPin(date, shiftType, secret);
  return enteredPin === expectedPin;
}

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
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS trong cài đặt.';
    case error.POSITION_UNAVAILABLE:
      return 'Không thể xác định vị trí. Vui lòng kiểm tra GPS.';
    case error.TIMEOUT:
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
    case 'photo':
      return '📸 Ảnh';
    case 'gps':
      return '📍 GPS';
    case 'pin':
      return '🔢 Mã PIN';
    default:
      return 'Không xác định';
  }
}

/**
 * Get check-in method color class
 */
export function getCheckInMethodColor(method: string): string {
  switch (method) {
    case 'photo':
      return 'text-green-600 bg-green-50';
    case 'gps':
      return 'text-blue-600 bg-blue-50';
    case 'pin':
      return 'text-amber-600 bg-amber-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
