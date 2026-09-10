/**
 * Authentication & Security Utilities
 * 
 * CRITICAL FIX: Previously passwords were stored as plaintext ('aiicafe')
 * and the PIN secret was hardcoded client-side ('aiicafe-2024').
 * 
 * This module provides:
 * - SHA-256 password hashing (using Web Crypto API)
 * - Session management with expiry
 * - Secure PIN generation (server-side ready)
 */

import {
  SESSION_TIMEOUT_MS,
  STORAGE_KEY_AUTH_TOKEN,
  STORAGE_KEY_SESSION_EXPIRY,
  STORAGE_KEY_CURRENT_USER,
  STORAGE_KEY_AUTH,
} from './constants';

// ═══════════════════════════════════════════════════
// Password Hashing (SHA-256 via Web Crypto API)
// ═══════════════════════════════════════════════════

/**
 * Hash a password using SHA-256.
 * In production, this should be replaced with bcrypt/argon2 on the backend.
 * SHA-256 is used here as a client-side improvement over plaintext.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a stored hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  // Constant-time comparison to prevent timing attacks
  if (passwordHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    result |= passwordHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════

/** Create a new session with expiry */
export function createSession(userId: string): void {
  const expiry = Date.now() + SESSION_TIMEOUT_MS;
  localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, `session_${userId}_${expiry}`);
  localStorage.setItem(STORAGE_KEY_SESSION_EXPIRY, expiry.toString());
  localStorage.setItem(STORAGE_KEY_AUTH, 'true');
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, userId);
}

/** Check if the current session is valid (not expired) */
export function isSessionValid(): boolean {
  const expiryStr = localStorage.getItem(STORAGE_KEY_SESSION_EXPIRY);
  const authFlag = localStorage.getItem(STORAGE_KEY_AUTH);
  
  if (authFlag !== 'true') return false;
  if (!expiryStr) return false;
  
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry)) return false;
  
  // Session expired
  if (Date.now() > expiry) {
    clearSession();
    return false;
  }
  
  return true;
}

/** Refresh session timeout (call on user activity) */
export function refreshSession(): void {
  const authFlag = localStorage.getItem(STORAGE_KEY_AUTH);
  if (authFlag !== 'true') return;
  
  const expiry = Date.now() + SESSION_TIMEOUT_MS;
  localStorage.setItem(STORAGE_KEY_SESSION_EXPIRY, expiry.toString());
  
  const token = localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  if (token) {
    const userId = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, `session_${userId}_${expiry}`);
  }
}

/** Clear all session data */
export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEY_SESSION_EXPIRY);
  localStorage.removeItem(STORAGE_KEY_AUTH);
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

// ═══════════════════════════════════════════════════
// PIN Generation (Server-side ready)
// ═══════════════════════════════════════════════════

/**
 * Generate a time-based shift PIN.
 * 
 * SECURITY FIX: The original code used a hardcoded secret 'aiicafe-2024'
 * client-side, which meant anyone reading the source could generate valid PINs.
 * 
 * This implementation uses a more secure approach:
 * - The secret is derived from a combination of device-specific values
 * - In production, PIN generation should happen server-side only
 * - This client-side version is a transitional improvement
 */
export function generateShiftPin(
  date: string,
  shiftType: 'morning' | 'afternoon' | 'evening'
): string {
  // Use a more secure derivation that's harder to predict
  // In production, this should be entirely server-side
  const secret = getDeviceDerivedSecret();
  const payload = `${date}-${shiftType}-${secret}`;
  return simpleHash(payload);
}

/**
 * Validate a shift PIN.
 */
export function validateShiftPin(
  enteredPin: string,
  date: string,
  shiftType: 'morning' | 'afternoon' | 'evening'
): boolean {
  const expectedPin = generateShiftPin(date, shiftType);
  // Constant-time comparison
  if (enteredPin.length !== expectedPin.length) return false;
  let result = 0;
  for (let i = 0; i < enteredPin.length; i++) {
    result |= enteredPin.charCodeAt(i) ^ expectedPin.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════

/**
 * Get a device-derived secret for PIN generation.
 * This is more secure than a hardcoded string because it varies per device.
 * In production, use server-side HMAC with a true secret.
 */
function getDeviceDerivedSecret(): string {
  // Combine multiple browser fingerprints for device-specific secret
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
  ];
  return simpleHash(components.join('|'));
}

/**
 * Simple hash function for PIN generation.
 * Returns 6-digit numeric string.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const pin = (Math.abs(hash) % 1000000).toString().padStart(6, '0');
  return pin;
}

/**
 * Get current shift type based on time.
 */
export function getCurrentShiftType(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
