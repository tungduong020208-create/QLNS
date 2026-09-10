/**
 * Shared constants for localStorage keys and configuration.
 * Centralizes all storage keys to prevent mismatches between components.
 * 
 * CRITICAL FIX: Previously CheckInCheckOut.tsx used 'aiicafe_checkin_session'
 * while ManagerDashboard.tsx read from 'coffeehouse_checkin_records' —
 * this caused Manager Dashboard to never show check-in data.
 */

// ═══════════════════════════════════════════════════
// Storage Keys — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════

/** Active check-in session for the current employee (who is logged in) */
export const STORAGE_KEY_CHECKIN_SESSION = 'aiicafe_checkin_session';

/** All check-in records indexed by employeeId — used by BOTH employee and manager */
export const STORAGE_KEY_ATTENDANCE_RECORDS = 'aiicafe_attendance_records';

/** User accounts list */
export const STORAGE_KEY_USERS = 'enterprise_hr_users';

/** Current logged-in user ID */
export const STORAGE_KEY_CURRENT_USER = 'enterprise_hr_current_user_id';

/** Auth state flag */
export const STORAGE_KEY_AUTH = 'enterprise_hr_auth';

/** Auth token (for future backend integration) */
export const STORAGE_KEY_AUTH_TOKEN = 'enterprise_hr_auth_token';

/** Session expiry timestamp */
export const STORAGE_KEY_SESSION_EXPIRY = 'enterprise_hr_session_expiry';

/** Evidence items */
export const STORAGE_KEY_EVIDENCES = 'enterprise_hr_evidences';

/** Notifications */
export const STORAGE_KEY_NOTIFICATIONS = 'enterprise_hr_notifications';

/** Customer ratings */
export const STORAGE_KEY_CUSTOMER_RATINGS = 'customerRatings';

/** Approval requests */
export const STORAGE_KEY_APPROVALS = 'coffeehouse_approvals';

/** QR reviews */
export const STORAGE_KEY_QR_REVIEWS = 'coffeehouse_qr_reviews';

/** Peer reviews */
export const STORAGE_KEY_PEER_REVIEWS = 'coffeehouse_peer_reviews';

/** Shifts */
export const STORAGE_KEY_SHIFTS = 'coffeehouse_shifts';

/** Shift registrations */
export const STORAGE_KEY_SHIFT_REGISTRATIONS = 'aiicafe_shift_registrations';

/** WiFi IP whitelist configuration */
export const STORAGE_KEY_WIFI_CONFIG = 'aiicafe_wifi_config';

// ═══════════════════════════════════════════════════
// Security Constants
// ═══════════════════════════════════════════════════

/** Session timeout in milliseconds (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Maximum login attempts before lockout */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Login lockout duration in milliseconds (15 minutes) */
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

// ═══════════════════════════════════════════════════
// Check-in Constants
// ═══════════════════════════════════════════════════

/** Maximum image size in bytes after compression (30KB) */
export const MAX_IMAGE_SIZE_BYTES = 30 * 1024;

/** Image compression quality (0-1) */
export const IMAGE_COMPRESSION_QUALITY = 0.6;

/** Maximum image width/height for compression */
export const IMAGE_MAX_DIMENSION = 400;

// ═══════════════════════════════════════════════════
// Peer Review Constants
// ═══════════════════════════════════════════════════

/** Minimum reviews required to appear on leaderboard */
export const MIN_REVIEWS_FOR_LEADERBOARD = 3;

// ═══════════════════════════════════════════════════
// Store Location (for GPS check-in)
// ═══════════════════════════════════════════════════

export const DEFAULT_STORE = {
  id: 'store-1',
  name: 'AiiCafe - Quận 1',
  latitude: 10.7769,
  longitude: 106.7009,
  radius: 100, // meters
} as const;
