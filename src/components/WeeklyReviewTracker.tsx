import React, { useMemo } from 'react';
import { PeerReviewSubmission } from '../types';

const REQUIRED_REVIEWS = 5; // Minimum reviews per week

interface WeeklyReviewTrackerProps {
  userId: string;
  peerReviews: PeerReviewSubmission[];
  className?: string;
}

// Get Monday of current week
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get Sunday of current week
const getSunday = (date: Date): Date => {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

// Format date to YYYY-MM-DD
const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const WeeklyReviewTracker: React.FC<WeeklyReviewTrackerProps> = ({
  userId,
  peerReviews,
  className = '',
}) => {
  const { reviewCount, progress, daysLeft, isWarning, isComplete } = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    const sunday = getSunday(today);
    const mondayStr = toDateStr(monday);
    const sundayStr = toDateStr(sunday);

    // Count reviews submitted this week by this user
    const weeklyReviews = peerReviews.filter((r) => {
      if (r.evaluatorId !== userId) return false;
      const reviewDate = new Date(r.submittedAt);
      return reviewDate >= monday && reviewDate <= sunday;
    });

    const count = weeklyReviews.length;
    const prog = Math.min((count / REQUIRED_REVIEWS) * 100, 100);
    
    // Calculate days left in week (Sunday - today)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysRemaining = dayOfWeek === 0 ? 0 : 6 - dayOfWeek + 1; // Days until Sunday
    
    const warning = count < REQUIRED_REVIEWS && daysRemaining <= 2;
    const complete = count >= REQUIRED_REVIEWS;

    return {
      reviewCount: count,
      progress: prog,
      daysLeft: daysRemaining,
      isWarning: warning,
      isComplete: complete,
    };
  }, [userId, peerReviews]);

  // Get status color and text
  const getStatusInfo = () => {
    if (isComplete) {
      return {
        color: '#4CAF72',
        bgColor: 'rgba(76,175,114,0.12)',
        text: 'Đã hoàn thành!',
        icon: 'check_circle',
      };
    }
    if (isWarning) {
      return {
        color: '#FF3131',
        bgColor: 'rgba(255,49,49,0.12)',
        text: `Còn ${daysLeft} ngày nữa hết tuần`,
        icon: 'warning',
      };
    }
    return {
      color: '#EFC14B',
      bgColor: 'rgba(239,193,75,0.12)',
      text: `Còn ${REQUIRED_REVIEWS - reviewCount} đánh giá nữa`,
      icon: 'pending',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]" style={{ color: statusInfo.color }}>
            {statusInfo.icon}
          </span>
          <h3 className="text-sm font-bold text-[#0F1E44]">Đánh giá tuần này</h3>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
        >
          {statusInfo.text}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#7A829A]">Tiến độ</span>
          <span className="text-xs font-bold" style={{ color: statusInfo.color }}>
            {reviewCount}/{REQUIRED_REVIEWS}
          </span>
        </div>
        <div className="h-2 bg-[#F5EDDF] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: statusInfo.color,
            }}
          />
        </div>
      </div>

      {/* Warning message if close to deadline */}
      {isWarning && !isComplete && (
        <div className="mt-3 p-2 bg-[#FF3131]/10 border border-[#FF3131]/30 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#FF3131]">notifications_active</span>
          <p className="text-[10px] text-[#FF3131] font-semibold">
            ⚠️ Cảnh báo: Còn {daysLeft} ngày nữa hết tuần. Bạn cần hoàn thành thêm {REQUIRED_REVIEWS - reviewCount} đánh giá!
          </p>
        </div>
      )}

      {/* Complete message */}
      {isComplete && (
        <div className="mt-3 p-2 bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#4CAF72]">emoji_events</span>
          <p className="text-[10px] text-[#4CAF72] font-semibold">
            🎉 Tuyệt vời! Bạn đã hoàn thành đủ {REQUIRED_REVIEWS} đánh giá tuần này.
          </p>
        </div>
      )}
    </div>
  );
};
