import React, { useMemo } from 'react';
import { PeerReviewSubmission } from '../types';
import { computeReviewCycle, REQUIRED_REVIEWS, ReviewPeriod } from '../utils/reviewCycle';

// Flip the whole requirement back to weekly by changing this one constant —
// everything else (window math, labels) derives from the period parameter.
const REVIEW_PERIOD: ReviewPeriod = 'month';

interface WeeklyReviewTrackerProps {
  userId: string;
  peerReviews: PeerReviewSubmission[];
  className?: string;
}

// Shared Vietnamese labels per period — kept beside the period constant so a
// period flip updates both math and copy in one file.
const PERIOD_LABELS: Record<ReviewPeriod, { title: string; reset: string }> = {
  week: { title: 'Đánh giá tuần này', reset: 'hết tuần' },
  month: { title: 'Đánh giá tháng này', reset: 'hết tháng' },
};

export const WeeklyReviewTracker: React.FC<WeeklyReviewTrackerProps> = ({
  userId,
  peerReviews,
  className = '',
}) => {
  // All date/window math lives in utils/reviewCycle.ts (pure, testable);
  // this component only renders the returned numbers.
  const { reviewCount, progress, daysLeft, isWarning, isComplete } = useMemo(
    () => computeReviewCycle(userId, peerReviews, REVIEW_PERIOD),
    [userId, peerReviews]
  );

  const periodLabels = PERIOD_LABELS[REVIEW_PERIOD];

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
        text: `Còn ${daysLeft} ngày nữa ${periodLabels.reset}`,
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
          <h3 className="text-sm font-bold text-[#0F1E44]">{periodLabels.title}</h3>
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
            ⚠️ Cảnh báo: Còn {daysLeft} ngày nữa {periodLabels.reset}. Bạn cần hoàn thành thêm {REQUIRED_REVIEWS - reviewCount} đánh giá!
          </p>
        </div>
      )}

      {/* Complete message */}
      {isComplete && (
        <div className="mt-3 p-2 bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#4CAF72]">emoji_events</span>
          <p className="text-[10px] text-[#4CAF72] font-semibold">
            🎉 Tuyệt vời! Bạn đã hoàn thành đủ {REQUIRED_REVIEWS} đánh giá tháng này.
          </p>
        </div>
      )}
    </div>
  );
};
