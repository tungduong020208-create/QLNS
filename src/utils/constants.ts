/**
 * Shared constants for localStorage keys and configuration.
 * Centralizes all storage keys to prevent mismatches between components.
 * 
 * CRITICAL FIX: Previously CheckInCheckOut.tsx used 'aiicafe_checkin_session'
 * while ManagerDashboard.tsx read from 'coffeehouse_checkin_records' —
 * this caused Manager Dashboard to never show check-in data.
 */

import { EmploymentType } from '../types';

// ═══════════════════════════════════════════════════
// Storage Keys — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════

/** Active check-in session for the current employee (who is logged in) */
export const STORAGE_KEY_CHECKIN_SESSION = 'aiicafe_checkin_session';

/** Work-hours records written on check-in/check-out (employee camera flow & manager toggle) */
export const STORAGE_KEY_CHECKINOUT_RECORDS = 'aiicafe_checkinout_records';

/** Weekly study schedules (employee-submitted) */
export const STORAGE_KEY_STUDY_SCHEDULES = 'aiicafe_study_schedules';

/** Manager-published weekly schedules */
export const STORAGE_KEY_MANUAL_ASSIGNMENTS = 'aiicafe_manual_assignments';

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

/** Geofence event audit trail (out-of-range alerts) */
export const STORAGE_KEY_GEOFENCE_EVENTS = 'aiicafe_geofence_events';

/** News feed post reactions (one row per (post, user)) */
export const STORAGE_KEY_POST_REACTIONS = 'aiicafe_post_reactions';

/** News feed post comments */
export const STORAGE_KEY_POST_COMMENTS = 'aiicafe_post_comments';

/** Dashboard collapse preference (persists across sessions) */
export const STORAGE_KEY_DASHBOARD_COLLAPSED = 'aiicafe_dashboard_collapsed';

// ═══════════════════════════════════════════════════
// Auto-Scheduling Configuration
// ═══════════════════════════════════════════════════
// When an employee submits a weekly registration, the app IMMEDIATELY places
// them into the official schedule (no manual manager approval needed) —
// unless a rule blocks it (shift full). See src/utils/autoSchedule.ts.

/**
 * Khóa store chứa các ô capacity manager đã chỉnh khác mặc định
 * (xem ShiftCapacityOverride trong types.ts). Chỉ lưu ô lệch chuẩn →
 * đọc 1 dòng code biết ô nào đang dùng mặc định.
 */
export const STORAGE_KEY_SHIFT_CAPACITY_OVERRIDES = 'coffeehouse_shift_capacity_overrides';

/**
 * Số người tối đa MẶC ĐỊNH theo ca (mục 3 của nghiệp vụ đăng ký ca):
 * Sáng 3, Chiều 3 (manager chỉnh được từng ca/ngày qua capacity overrides),
 * Tối 3.
 *
 * Khung giờ ca khớp PART_TIME tạm thời để không phá dữ liệu/hiển thị cũ;
 * giờ thật của mỗi row luôn do getShiftTimeRange() quyết định theo loại NV.
 */
export const SHIFT_CAPACITY_DEFAULTS: Record<'morning' | 'afternoon' | 'evening', number> = {
  morning: 3,
  afternoon: 3,
  evening: 3,
};

/**
 * KHUNG GIỜ CA — nguồn cấu hình DUY NHẤT, phân theo loại nhân viên
 * (mục 2 của nghiệp vụ đăng ký ca). Mọi nơi từng hardcode giờ
 * (autoSchedule, ManagerScheduleScreen, ManagerStudySchedulesScreen)
 * đều đọc từ đây qua getShiftTimeRange() — đổi giờ chỉ cần sửa 1 chỗ.
 */
export const SHIFT_TIME_RANGES: Record<
  'morning' | 'afternoon' | 'evening',
  Record<EmploymentType, { start: string; end: string }>
> = {
  morning: {
    'part-time': { start: '06:30', end: '11:30' },
    'full-time': { start: '06:30', end: '15:00' },
  },
  afternoon: {
    'part-time': { start: '11:30', end: '17:30' },
    'full-time': { start: '14:30', end: '23:00' },
  },
  evening: {
    'part-time': { start: '17:30', end: '22:30' },
    'full-time': { start: '14:30', end: '23:00' },
  },
};

/** Đảo ngược tên ca ('Ca sáng') → slot ('morning') — tra capacity mặc định. */
export const SHIFT_NAME_TO_SLOT: Record<string, 'morning' | 'afternoon' | 'evening'> = {
  'Ca sáng': 'morning',
  'Ca chiều': 'afternoon',
  'Ca tối': 'evening',
};

/**
 * Map ca → khung giờ cụ thể của một nhân viên theo loại hợp đồng.
 * THE hàm "hệ thống tự động map khung giờ theo Employee.type" (mục 4).
 * employmentType bỏ trống (tài khoản cũ) → mặc định part-time.
 */
export function getShiftTimeRange(
  shiftType: 'morning' | 'afternoon' | 'evening',
  employmentType?: EmploymentType
): { start: string; end: string } {
  return SHIFT_TIME_RANGES[shiftType][employmentType ?? 'part-time'];
}

/** Official time slots for the auto-placed shifts (must match the manager UI templates). */
export const SHIFT_SLOT_TEMPLATES: Record<'morning' | 'afternoon' | 'evening', { name: string; startTime: string; endTime: string }> = {
  morning:   { name: 'Ca sáng', startTime: '07:00', endTime: '12:00' },
  afternoon: { name: 'Ca chiều', startTime: '13:00', endTime: '18:00' },
  evening:   { name: 'Ca tối', startTime: '18:00', endTime: '22:00' },
};

// ═══════════════════════════════════════════════════
// Office Wi-Fi Configuration (site-specific, from .env.local)
// ═══════════════════════════════════════════════════
// NOTE: Browsers cannot read SSID/BSSID, so the office network is
// identified by Public IP + local subnet instead (see src/utils/ipCheck.ts).
//
// REAL VALUES LIVE IN `.env.local` (gitignored — the office IP must not be
// committed). `.env.example` is the committed template with RFC 5737
// placeholders, so a fresh checkout still typechecks and runs.
// Vite bakes these at STARTUP: restart the dev server after editing.
// Typed in src/vite-env.d.ts.

/**
 * Office Wi-Fi identity used for attendance validation.
 * - displayName: shown to employees in error messages ("kết nối Wifi ...")
 * - publicIPs: the office router's public IP(s) (e.g. "203.0.113.7")
 * - localSubnets: allowed LAN ranges in CIDR (e.g. "192.168.1.0/24")
 * - fallbackEnabled: allow GPS/PIN fallback when Wi-Fi check fails
 *
 * Values come from `.env.local` (gitignored) — see `.env.example` for the
 * template. Restart the dev server after editing (Vite reads env at startup).
 */
export const OFFICE_WIFI = {
  displayName: import.meta.env?.VITE_OFFICE_WIFI_NAME || 'Office WiFi',
  publicIPs: (import.meta.env?.VITE_OFFICE_PUBLIC_IPS || '')
    .split(',').map(s => s.trim()).filter(Boolean) as string[],
  localSubnets: (import.meta.env?.VITE_OFFICE_LOCAL_SUBNETS || '')
    .split(',').map(s => s.trim()).filter(Boolean) as string[],
  // BUG 6 FIX: Default to true — always allow GPS/PIN fallback so employees
  // are never fully locked out when WiFi config is slightly off or the
  // network blocks IP-lookup APIs. Set to 'false' only if you have a
  // separate physical access control (badge, keypad) as the sole fallback.
  fallbackEnabled: import.meta.env?.VITE_OFFICE_WIFI_FALLBACK !== 'false',
};

/**
 * Geofence monitoring settings (runs from check-in until check-out).
 * - alertRadiusM: distance from office that triggers a manager alert
 * - checkIntervalMin: how often the position is sampled (3–5 min)
 * - repeatAlertMin: re-alert if the employee is still out of range
 */
export const GEOFENCE = {
  alertRadiusM: 50,
  checkIntervalMin: 4,
  repeatAlertMin: 15,
} as const;

// ═══════════════════════════════════════════════════
// Security Constants
// ═══════════════════════════════════════════════════

/** Session timeout in milliseconds (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Maximum login attempts before lockout */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Login lockout duration in milliseconds (15 minutes) */
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

/** Login throttle state: failed attempt counter + lockout deadline */
export const STORAGE_KEY_LOGIN_THROTTLE = 'enterprise_hr_login_throttle';

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
  // BUG 4 FIX: Increased from 100m to 150m. Indoor GPS accuracy is
  // typically 30-50m; a 100m radius causes false negatives when the
  // employee is physically at the store but GPS drifts slightly.
  // The attendanceGate also adds GPS accuracy as a buffer (see below).
  radius: 150, // meters
} as const;
