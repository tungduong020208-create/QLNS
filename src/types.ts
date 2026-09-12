export type UserRole = 'employee' | 'manager';

export interface User {
  id: string;
  name: string;
  employeeCode: string;
  department?: string;        // Deprecated - kept for backward compat
  role: UserRole;             // Only 'manager' or 'employee'
  avatar: string;
  email: string;
  phone?: string;
  password?: string;          // Hashed password (for auth)
  mustChangePassword?: boolean; // Force change on first login
  isAccountActive?: boolean;   // Admin can deactivate
}

export type EvidenceStatus = 'good' | 'pending' | 'bad';

export interface EvidenceReaction {
  userId: string;
  type: 'good' | 'bad';
}

export interface EvidenceItem {
  id: string;
  title: string;
  department?: string;  // Deprecated
  timestamp: string;
  dateString: string;
  imageUrl: string;
  description: string;
  status: EvidenceStatus;
  points: number;
  managerNote?: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reactions?: EvidenceReaction[];
}

export type NotificationCategory = 'management';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reward' | 'penalty' | 'pending' | 'system';
  category: NotificationCategory;
  userId?: string;          // Optional: ties notification to a specific user
}

export interface WeeklyData {
  week: string;
  percentage: number;
  goodCount: number;
  totalCount: number;
  points: number;
  isCurrent?: boolean;
}



export interface HandoverTask {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface ShiftHandover {
  id: string;
  shiftName: string;           // "Ca sáng" | "Ca chiều" | "Ca tối"
  shiftTime: string;           // "07:00 - 12:00"
  fromEmployee: User;
  toEmployee: User;
  date: string;
  dateString: string;
  status: 'pending' | 'confirmed' | 'completed';
  checklist: HandoverTask[];
  notes: string;
  previousNotes?: string;      // Ghi chú từ ca trước
  confirmedAt?: string;
  handoverPhoto?: string;      // Ảnh bàn giao
}

export type ActiveTab = 'home' | 'submit' | 'review' | 'profile' | 'approval' | 'qr_review' | 'peer_review' | 'manager_schedule';


export interface CustomerRating {
  id: string;
  employeeId: string;
  customerName: string;
  rating: 'good' | 'normal' | 'bad';
  comment?: string;
  timestamp: string;
  dateString: string;
}





export interface QRReview {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  customerName: string;
  stars: number;
  comment?: string;
  timestamp: string;
  dateString: string;
  sentToGoogle: boolean;
}

export type CheckInMethod = 'photo' | 'gps' | 'pin';

export interface CheckInLocation {
  latitude: number;
  longitude: number;
  accuracy: number;        // meters
  distanceFromStore?: number; // meters
}

export interface CheckInRecord {
  id: string;
  type: 'checkin' | 'checkout';
  time: string;
  address: string;
  photo: string;           // base64 data URL (empty if fallback)
  smileDetected: boolean;
  timestamp: number;       // unix ms

  // Fallback fields
  checkInMethod: CheckInMethod;
  location?: CheckInLocation;
  pinAttempt?: number;     // Number of PIN attempts
  fallbackReason?: string; // 'camera_error' | 'camera_denied' | 'user_choice'
}

export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;          // meters (default: 100)
}

// Peer Review / Cross Evaluation types
export interface PeerReviewCriteria {
  id: string;
  question: string;
  category: string;
  maxStars: number;          // 1-5 star rating
}

export interface PeerReviewAnswer {
  criteriaId: string;
  stars: number;             // 1-5 stars
}

export interface PeerReviewSubmission {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorAvatar: string;
  targetId: string;
  targetName: string;
  targetAvatar: string;
  answers: PeerReviewAnswer[];
  totalScore: number;        // Sum of all star ratings
  avgScore: number;          // Average star score
  comment?: string;
  submittedAt: string;
  dateString: string;        // ISO date for day-level dedup
  monthKey: string;          // 'YYYY-MM' for monthly dedup
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar: string;
  role: UserRole;
  totalScore: number;        // Sum of all received scores
  avgScore: number;          // Average score across all reviews received
  reviewCount: number;       // Number of reviews received
  rank: number;              // Position on leaderboard
}

// ─── Shift Registration (Weekly Schedule) ───
export type ShiftSlot = 'morning' | 'afternoon' | 'evening' | 'off';

export interface DayShiftRegistration {
  date: string;              // YYYY-MM-DD
  dayLabel: string;           // 'Thứ 2', 'Thứ 3', ...
  shift: ShiftSlot;
}

export interface WeeklyShiftRegistration {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  weekStart: string;          // YYYY-MM-DD (Monday of target year)
  year: number;
  weekNumber: number;         // ISO week number
  days: DayShiftRegistration[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  managerNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Work Hours Tracking ───
export interface CheckInOutRecord {
  id: string;
  userId: string;
  date: string;              // YYYY-MM-DD
  checkInTime: string;       // ISO timestamp
  checkOutTime?: string;     // ISO timestamp (null if still working)
  hoursWorked?: number;      // Calculated hours
  shiftName?: string;        // 'Ca sáng', 'Ca chiều', etc.
}

// ─── Geofence Monitoring (post check-in) ───
export interface GeofenceEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;          // ISO timestamp
  latitude: number;
  longitude: number;
  distanceMeters: number;     // measured distance from office
  thresholdMeters: number;    // alert radius at time of event
  isRepeat: boolean;          // true = repeated alert while still out of range
}

export interface WorkHoursSummary {
  userId: string;
  userName: string;
  userAvatar: string;
  employeeCode: string;
  month: string;             // YYYY-MM
  totalHours: number;        // Total hours worked in month
  checkInCount: number;      // Number of check-in/out pairs
  records: CheckInOutRecord[];
}

// ─── Weekly Review Tracking ───
export interface WeeklyReviewCount {
  userId: string;
  weekStart: string;         // YYYY-MM-DD (Monday)
  reviewCount: number;       // Number of reviews submitted this week
  lastReviewAt?: string;     // ISO timestamp of last review
}

// ─── Study Schedule ───
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface StudyTimeSlot {
  startTime: string;         // HH:mm
  endTime: string;           // HH:mm
  subject?: string;          // Optional subject name
}

export interface DayStudySchedule {
  day: DayOfWeek;
  isBusy: boolean;
  timeSlots: StudyTimeSlot[];
  note?: string;
}

export interface StudySchedule {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  weekStart: string;         // YYYY-MM-DD (Monday)
  year: number;
  weekNumber: number;
  days: DayStudySchedule[];
  submittedAt: string;
  managerNote?: string;
}

// ─── Manual Shift Assignment ───
export interface ManualShiftAssignment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  weekStart: string;
  year: number;
  weekNumber: number;
  shifts: {
    date: string;            // YYYY-MM-DD
    shiftName: string;       // 'Ca sáng', 'Ca chiều', 'Ca tối'
    startTime: string;       // HH:mm
    endTime: string;         // HH:mm
  }[];
  publishedAt?: string;
  publishedBy?: string;
  notes?: string;
}
