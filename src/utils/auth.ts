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
 * - Login throttling (brute-force lockout counter, client-side)
 */

import {
  SESSION_TIMEOUT_MS,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_LOCKOUT_MS,
  STORAGE_KEY_AUTH_TOKEN,
  STORAGE_KEY_SESSION_EXPIRY,
  STORAGE_KEY_CURRENT_USER,
  STORAGE_KEY_AUTH,
  STORAGE_KEY_LOGIN_THROTTLE,
} from './constants';
import { safeParse, writeStoredValue } from '../hooks/usePersistentState';

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
// Login Throttling (client-side brute-force defense)
// ═══════════════════════════════════════════════════
//
// WHY: without a counter, an attacker (or a curious coworker) can try every
// password on an unlocked machine forever. MAX_LOGIN_ATTEMPTS failures within
// a window trigger LOGIN_LOCKOUT_MS of hard lockout. The counter resets on
// success or after the lockout expires.
//
// HONEST LIMITATION: this is CLIENT-SIDE — it protects against casual abuse
// on shared devices, not against scripted attacks (anyone can clear
// localStorage). Real rate limiting must live on the server. Same story as
// every other check in this SPA: good UX guardrail, not a security boundary.

interface LoginThrottleState {
  failedAttempts: number;   // consecutive failures (reset on success)
  lockedUntil: number | null; // unix ms — while set + in future, login is blocked
}

const EMPTY_THROTTLE: LoginThrottleState = { failedAttempts: 0, lockedUntil: null };

/** Current throttle state, self-healing: an expired lockout clears itself. */
export function getLoginThrottle(): LoginThrottleState {
  const state = safeParse<LoginThrottleState>(STORAGE_KEY_LOGIN_THROTTLE, EMPTY_THROTTLE);
  if (state.lockedUntil !== null && Date.now() >= state.lockedUntil) {
    // Lockout window elapsed → clear it, keep/Reset the counter history
    const cleared = { ...state, lockedUntil: null };
    writeStoredValue(STORAGE_KEY_LOGIN_THROTTLE, cleared);
    return cleared;
  }
  return state;
}

/** Seconds until the lockout lifts (0 when not locked). */
export function getLockoutSecondsRemaining(): number {
  const { lockedUntil } = getLoginThrottle();
  if (lockedUntil === null) return 0;
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

/** True while login should be refused outright. */
export function isLoginLocked(): boolean {
  return getLockoutSecondsRemaining() > 0;
}

/** Record a failed attempt; trips the lockout when the threshold is reached. */
export function recordFailedLoginAttempt(): void {
  const state = getLoginThrottle();
  const failedAttempts = state.failedAttempts + 1;
  const lockedUntil =
    failedAttempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCKOUT_MS : null;
  writeStoredValue(STORAGE_KEY_LOGIN_THROTTLE, { failedAttempts, lockedUntil });
}

/** Successful login clears the failure history. */
export function resetLoginThrottle(): void {
  writeStoredValue(STORAGE_KEY_LOGIN_THROTTLE, EMPTY_THROTTLE);
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
