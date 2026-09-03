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

export type NotificationCategory = 'management' | 'handover';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reward' | 'penalty' | 'pending' | 'system';
  category: NotificationCategory;
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

export type ApprovalType = 'shift_swap' | 'time_off' | 'overtime' | 'other';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  date: string;
  dateString: string;
  status: 'pending' | 'approved' | 'rejected';
  targetEmployee?: string;
  targetEmployeeId?: string;
  managerNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
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

export interface CheckInRecord {
  id: string;
  type: 'checkin' | 'checkout';
  time: string;
  address: string;
  photo: string; // base64 data URL
  smileDetected: boolean;
  timestamp: number; // unix ms
}

// Peer Review / Cross Evaluation types
export interface PeerReviewCriteria {
  id: string;
  question: string;
  category: string;
  options: string[];
}

export interface PeerReviewAnswer {
  criteriaId: string;
  answer: string;
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
  comment?: string;
  submittedAt: string;
  dateString: string;
}
