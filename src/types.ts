export type UserRole = 'employee' | 'manager';

export interface User {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  role: UserRole;
  avatar: string;
  email: string;
  phone?: string;
}

export type EvidenceStatus = 'good' | 'pending' | 'bad';

export interface EvidenceReaction {
  userId: string;
  type: 'good' | 'bad';
}

export interface EvidenceItem {
  id: string;
  title: string;
  department: string;
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

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reward' | 'penalty' | 'pending' | 'system';
}

export interface WeeklyData {
  week: string;
  percentage: number;
  goodCount: number;
  totalCount: number;
  points: number;
  isCurrent?: boolean;
}

export type ActiveTab = 'home' | 'submit' | 'review' | 'profile';

export interface CheckInRecord {
  id: string;
  type: 'checkin' | 'checkout';
  time: string;
  address: string;
  photo: string; // base64 data URL
  smileDetected: boolean;
  timestamp: number; // unix ms
}
