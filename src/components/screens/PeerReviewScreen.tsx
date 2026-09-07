import React, { useState, useMemo } from 'react';
import { User, PeerReviewSubmission, LeaderboardEntry } from '../../types';
import { PEER_REVIEW_CRITERIA } from '../../data/peerReviewData';

interface PeerReviewScreenProps {
  currentUser: User;
  allUsers: User[];
  peerReviews: PeerReviewSubmission[];
  onSubmitReview: (submission: PeerReviewSubmission) => void;
  onMarkNotificationRead?: (id: string) => void;
}

// ─── Helper: compute leaderboard from peer reviews with tie-breaking ───
function computeLeaderboard(
  peerReviews: PeerReviewSubmission[],
  allUsers: User[],
  monthKey: string,
): LeaderboardEntry[] {
  const monthReviews = peerReviews.filter((r) => r.monthKey === monthKey);

  // Aggregate scores per target employee
  const scoreMap = new Map<string, { total: number; count: number }>();
  for (const review of monthReviews) {
    const existing = scoreMap.get(review.targetId) || { total: 0, count: 0 };
    existing.total += review.avgScore;
    existing.count += 1;
    scoreMap.set(review.targetId, existing);
  }

  // Build entries for ALL employees
  const entries: LeaderboardEntry[] = allUsers.map((user) => {
    const data = scoreMap.get(user.id);
    return {
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      role: user.role,
      totalScore: data ? Math.round(data.total * 100) / 100 : 0,
      avgScore: data ? Math.round((data.total / data.count) * 100) / 100 : 0,
      reviewCount: data ? data.count : 0,
      rank: 0,
    };
  });

  // Sort: avgScore DESC → reviewCount DESC (tie-breaking)
  entries.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.reviewCount - a.reviewCount;
  });

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}

// ─── Get available month keys from reviews ───
function getAvailableMonths(reviews: PeerReviewSubmission[]): string[] {
  const keys = new Set(reviews.map((r) => r.monthKey));
  return Array.from(keys).sort().reverse();
}

// ─── Get rank title/badge ───
function getRankBadge(rank: number, avgScore: number): { title: string; color: string; icon: string } {
  if (rank === 1) return { title: 'Ngôi sao', color: 'from-[#EFC14B] to-[#F5D76E]', icon: 'emoji_events' };
  if (rank === 2) return { title: 'Xuất sắc', color: 'from-[#C0C0C0] to-[#D4D4D4]', icon: 'military_tech' };
  if (rank === 3) return { title: 'Nổi bật', color: 'from-[#CD7F32] to-[#D4954A]', icon: 'workspace_premium' };
  if (avgScore >= 4.5) return { title: 'Hoàn hảo', color: 'from-[#4CAF72] to-[#66BB6A]', icon: 'star' };
  if (avgScore >= 3.5) return { title: 'Tốt', color: 'from-[#2196F3] to-[#42A5F5]', icon: 'thumb_up' };
  return { title: '', color: '', icon: '' };
}

// ─── Star Rating Component ───
const StarRating: React.FC<{
  value: number;
  onChange?: (stars: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}> = ({ value, onChange, max = 5, size = 'md', readonly = false }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${sizeClasses[size]} transition-all ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${
            star <= value
              ? 'text-[#EFC14B]'
              : 'text-[#E8DFD0]'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: star <= value ? "'FILL' 1" : "'FILL' 0" }}>
            star
          </span>
        </button>
      ))}
    </div>
  );
};

// ─── Main Component ───
export const PeerReviewScreen: React.FC<PeerReviewScreenProps> = ({
  currentUser,
  allUsers,
  peerReviews,
  onSubmitReview,
}) => {
  const isManager = currentUser.role === 'manager';

  // Tab state
  const [activeTab, setActiveTab] = useState<'review' | 'leaderboard' | 'history'>(
    isManager ? 'leaderboard' : 'review'
  );

  // Review form state
  const [reviewTargets, setReviewTargets] = useState<
    { userId: string; answers: Record<string, number>; comment: string }[]
  >([]);
  const [selectedNewTarget, setSelectedNewTarget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // History filter state (manager only)
  const [filterTarget, setFilterTarget] = useState('all');
  const [filterEvaluator, setFilterEvaluator] = useState('all');
  const [selectedReview, setSelectedReview] = useState<PeerReviewSubmission | null>(null);

  // Leaderboard filter state
  const [selectedMonth, setSelectedMonth] = useState<string>('current');

  // Current month key
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Available months for filter
  const availableMonths = useMemo(() => getAvailableMonths(peerReviews), [peerReviews]);

  // Effective month key for leaderboard
  const effectiveMonthKey = useMemo(() => {
    if (selectedMonth === 'current') return currentMonthKey;
    return selectedMonth;
  }, [selectedMonth, currentMonthKey]);

  // Check if current user has already reviewed a specific target this month
  const getMonthlyReviewStatus = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const review of peerReviews) {
      if (review.evaluatorId === currentUser.id && review.monthKey === currentMonthKey) {
        map.set(review.targetId, true);
      }
    }
    return map;
  }, [peerReviews, currentUser.id, currentMonthKey]);

  // Available targets (excluding self and already-reviewed this month)
  const availableTargets = useMemo(() => {
    return allUsers.filter(
      (u) => u.id !== currentUser.id && !getMonthlyReviewStatus.has(u.id)
    );
  }, [allUsers, currentUser.id, getMonthlyReviewStatus]);

  // Leaderboard
  const leaderboard = useMemo(() => {
    return computeLeaderboard(peerReviews, allUsers, effectiveMonthKey);
  }, [peerReviews, allUsers, effectiveMonthKey]);

  // Filtered leaderboard (only those with reviews)
  const leaderboardWithReviews = useMemo(() => {
    return leaderboard.filter((e) => e.reviewCount > 0);
  }, [leaderboard]);

  // Top 3
  const top3 = useMemo(() => leaderboardWithReviews.slice(0, 3), [leaderboardWithReviews]);

  // Rest of leaderboard (rank 4+)
  const restOfLeaderboard = useMemo(() => leaderboardWithReviews.slice(3), [leaderboardWithReviews]);

  // My rank
  const myRank = useMemo(() => {
    return leaderboard.find((e) => e.userId === currentUser.id);
  }, [leaderboard, currentUser.id]);

  // Filtered reviews for manager
  const filteredReviews = useMemo(() => {
    if (!isManager) return [];
    return peerReviews.filter((r) => {
      if (filterTarget !== 'all' && r.targetId !== filterTarget) return false;
      if (filterEvaluator !== 'all' && r.evaluatorId !== filterEvaluator) return false;
      return true;
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [peerReviews, isManager, filterTarget, filterEvaluator]);

  // Unique evaluators & targets for filters
  const uniqueEvaluators = useMemo(() => {
    const ids = new Set(peerReviews.map((r) => r.evaluatorId));
    return allUsers.filter((u) => ids.has(u.id));
  }, [peerReviews, allUsers]);

  const uniqueTargets = useMemo(() => {
    const ids = new Set(peerReviews.map((r) => r.targetId));
    return allUsers.filter((u) => ids.has(u.id));
  }, [peerReviews, allUsers]);

  const allTargets = useMemo(() => {
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [allUsers, currentUser.id]);

  // ─── Handlers ───
  const handleAddTarget = () => {
    if (!selectedNewTarget) return;
    if (reviewTargets.some((t) => t.userId === selectedNewTarget)) return;
    setReviewTargets((prev) => [
      ...prev,
      { userId: selectedNewTarget, answers: {}, comment: '' },
    ]);
    setSelectedNewTarget('');
  };

  const handleRemoveTarget = (userId: string) => {
    setReviewTargets((prev) => prev.filter((t) => t.userId !== userId));
  };

  const handleStarChange = (userId: string, criteriaId: string, stars: number) => {
    setReviewTargets((prev) =>
      prev.map((t) =>
        t.userId === userId
          ? { ...t, answers: { ...t.answers, [criteriaId]: stars } }
          : t
      )
    );
  };

  const handleCommentChange = (userId: string, comment: string) => {
    setReviewTargets((prev) =>
      prev.map((t) => (t.userId === userId ? { ...t, comment } : t))
    );
  };

  const handleSubmitAll = () => {
    const allComplete = reviewTargets.every(
      (t) => Object.keys(t.answers).length === PEER_REVIEW_CRITERIA.length
    );
    if (!allComplete) return;

    setIsSubmitting(true);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const target of reviewTargets) {
      const targetUser = allUsers.find((u) => u.id === target.userId);
      if (!targetUser) continue;

      const answers = PEER_REVIEW_CRITERIA.map((c) => ({
        criteriaId: c.id,
        stars: target.answers[c.id] || 0,
      }));

      const totalScore = answers.reduce((sum, a) => sum + a.stars, 0);
      const avgScore = Math.round((totalScore / answers.length) * 100) / 100;

      const submission: PeerReviewSubmission = {
        id: `pr-${Date.now()}-${target.userId}`,
        evaluatorId: currentUser.id,
        evaluatorName: currentUser.name,
        evaluatorAvatar: currentUser.avatar,
        targetId: target.userId,
        targetName: targetUser.name,
        targetAvatar: targetUser.avatar,
        answers,
        totalScore,
        avgScore,
        comment: target.comment.trim() || undefined,
        submittedAt: now.toISOString(),
        dateString: now.toISOString().split('T')[0],
        monthKey,
      };

      onSubmitReview(submission);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setReviewTargets([]);
      setSuccessMessage(`Đã gửi đánh giá cho ${reviewTargets.length} đồng nghiệp!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 600);
  };

  const getMonthLabel = (key: string) => {
    if (key === 'current') return 'Tháng này';
    const [y, m] = key.split('-');
    const months = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    });
  };

  // ─── Render ───
  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="mb-5">
        <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Đánh giá</h2>
        <p className="text-xs text-[#7A829A] mt-0.5">
          {isManager
            ? 'Xem bảng xếp hạng và lịch sử đánh giá chéo'
            : 'Đánh giá đồng nghiệp và theo dõi xếp hạng'}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-[#4CAF72]/15 text-[#4CAF72] text-sm font-semibold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-5 bg-[#F5EDDF] rounded-xl p-1">
        {isManager ? (
          <>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">leaderboard</span>
              Xếp hạng
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">history</span>
              Lịch sử
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'review'
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">rate_review</span>
              Đánh giá
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">leaderboard</span>
              Xếp hạng
            </button>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: REVIEW FORM (Employee only)                    */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === 'review' && !isManager && (
        <div className="space-y-4">
          {/* My rank badge */}
          {myRank && myRank.reviewCount > 0 && (
            <div className="bg-gradient-to-r from-[#EFC14B]/20 to-[#EFC14B]/5 border border-[#EFC14B]/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EFC14B]/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl text-[#0F1E44]">emoji_events</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F1E44]">Xếp hạng của bạn</p>
                <p className="text-xs text-[#7A829A]">
                  #{myRank.rank} · Điểm TB: {myRank.avgScore.toFixed(1)} ★ · {myRank.reviewCount} đánh giá
                </p>
              </div>
            </div>
          )}

          {/* Add target selector */}
          {availableTargets.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#0F1E44] mb-3">Thêm đồng nghiệp đánh giá</h3>
              <div className="flex gap-2">
                <select
                  value={selectedNewTarget}
                  onChange={(e) => setSelectedNewTarget(e.target.value)}
                  className="flex-1 rounded-xl border border-[#E8DFD0] bg-white px-3 py-2.5 text-sm text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                >
                  <option value="">-- Chọn đồng nghiệp --</option>
                  {availableTargets.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddTarget}
                  disabled={!selectedNewTarget}
                  className="px-4 py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold hover:bg-[#1A2D5A] disabled:opacity-40 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
          )}

          {/* No more targets */}
          {availableTargets.length === 0 && reviewTargets.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-[#EFC14B] mb-3 block">check_circle</span>
              <h3 className="font-heading font-bold text-[#0F1E44] mb-1">Đã đánh giá hết tháng này</h3>
              <p className="text-xs text-[#7A829A]">Bạn đã đánh giá tất cả đồng nghiệp trong tháng.</p>
            </div>
          )}

          {/* Review target cards */}
          {reviewTargets.map((target) => {
            const targetUser = allUsers.find((u) => u.id === target.userId);
            if (!targetUser) return null;
            const answeredCount = Object.keys(target.answers).length;
            const allAnswered = answeredCount === PEER_REVIEW_CRITERIA.length;

            return (
              <div key={target.userId} className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={targetUser.avatar} alt={targetUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#EFC14B]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#0F1E44]">{targetUser.name}</h4>
                      <p className="text-[10px] text-[#7A829A]">{targetUser.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveTarget(target.userId)} className="text-[#FF3131] hover:bg-[#FF3131]/10 p-1.5 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  {PEER_REVIEW_CRITERIA.map((criteria) => (
                    <div key={criteria.id} className="bg-[#FDF8EE] rounded-xl p-3">
                      <p className="text-sm font-semibold text-[#0F1E44] mb-1">{criteria.question}</p>
                      <p className="text-[10px] text-[#7A829A] uppercase tracking-wider mb-2">{criteria.category}</p>
                      <StarRating
                        value={target.answers[criteria.id] || 0}
                        onChange={(stars) => handleStarChange(target.userId, criteria.id, stars)}
                        size="md"
                      />
                    </div>
                  ))}
                </div>

                <textarea
                  value={target.comment}
                  onChange={(e) => handleCommentChange(target.userId, e.target.value)}
                  placeholder="Nhận xét thêm (tùy chọn)..."
                  rows={2}
                  className="w-full rounded-xl border border-[#E8DFD0] bg-white px-3 py-2.5 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#EFC14B] outline-none resize-none mb-3"
                />

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${allAnswered ? 'text-[#4CAF72]' : 'text-[#7A829A]'}`}>
                    {allAnswered ? '✓ Đầy đủ' : `${answeredCount}/${PEER_REVIEW_CRITERIA.length} tiêu chí`}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Submit button */}
          {reviewTargets.length > 0 && (
            <button
              onClick={handleSubmitAll}
              disabled={
                isSubmitting ||
                !reviewTargets.every((t) => Object.keys(t.answers).length === PEER_REVIEW_CRITERIA.length)
              }
              className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Gửi đánh giá ({reviewTargets.length} người)</span>
                </>
              )}
            </button>
          )}

          {/* Criteria preview */}
          {reviewTargets.length === 0 && availableTargets.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm">
              <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-3">Tiêu chí đánh giá</h3>
              <div className="space-y-3">
                {PEER_REVIEW_CRITERIA.map((criteria, idx) => (
                  <div key={criteria.id} className="flex items-center gap-3 p-3 bg-[#FDF8EE] rounded-xl">
                    <div className="w-8 h-8 bg-[#EFC14B]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#0F1E44]">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0F1E44]">{criteria.question}</p>
                      <p className="text-[10px] text-[#7A829A] uppercase tracking-wider">{criteria.category}</p>
                    </div>
                    <div className="text-[#EFC14B]">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#7A829A] mt-4 text-center">
                Đánh giá từ 1-5 sao cho mỗi tiêu chí. Chọn đồng nghiệp ở trên để bắt đầu.
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#EFC14B] text-xl mt-0.5">lock</span>
            <div>
              <h4 className="text-sm font-bold text-[#0F1E44] mb-1">Bảo mật đánh giá</h4>
              <p className="text-xs text-[#7A829A]">
                Bạn được đánh giá tối đa 1 lần mỗi người trong tháng. Kết quả được bảo mật — chỉ quản lý xem được chi tiết.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: LEADERBOARD (Both roles)                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Month Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMonth('current')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedMonth === 'current'
                  ? 'bg-[#0F1E44] text-white shadow-sm'
                  : 'bg-[#F5EDDF] text-[#7A829A] hover:text-[#0F1E44]'
              }`}
            >
              Tháng này
            </button>
            {availableMonths.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMonth(key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedMonth === key
                    ? 'bg-[#0F1E44] text-white shadow-sm'
                    : 'bg-[#F5EDDF] text-[#7A829A] hover:text-[#0F1E44]'
                }`}
              >
                {getMonthLabel(key)}
              </button>
            ))}
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#0F1E44]">{leaderboardWithReviews.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Được xếp hạng</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#EFC14B]">
                {peerReviews.filter((r) => r.monthKey === effectiveMonthKey).length}
              </p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Lượt đánh giá</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#4CAF72]">
                {leaderboardWithReviews.length > 0
                  ? (leaderboardWithReviews.reduce((sum, e) => sum + e.avgScore, 0) / leaderboardWithReviews.length).toFixed(1)
                  : '—'}
              </p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Điểm TB chung</p>
            </div>
          </div>

          {leaderboardWithReviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">leaderboard</span>
              <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có dữ liệu</h3>
              <p className="text-xs text-[#7A829A]">Chưa có đánh giá nào trong kỳ này.</p>
            </div>
          ) : (
            <>
              {/* ─── TOP 3 PODIUM ─── */}
              {top3.length >= 1 && (
                <div className="bg-gradient-to-br from-[#0F1E44] to-[#1A2D5A] rounded-2xl p-5 shadow-lg">
                  <div className="flex items-end justify-center gap-4">
                    {/* 2nd Place */}
                    {top3.length >= 2 && (
                      <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="relative mb-2">
                          <img src={top3[1].userAvatar} alt={top3[1].userName} className="w-14 h-14 rounded-full border-3 border-[#C0C0C0] object-cover shadow-lg" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#C0C0C0] rounded-full flex items-center justify-center shadow">
                            <span className="text-[10px] font-bold text-[#333]">2</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-white truncate w-full text-center">{top3[1].userName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[#C0C0C0] text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-xs font-bold text-white">{top3[1].avgScore.toFixed(1)}</span>
                        </div>
                        <div className="mt-1.5 px-2 py-0.5 bg-[#C0C0C0]/20 rounded-full">
                          <span className="text-[9px] font-bold text-[#C0C0C0]">Xuất sắc</span>
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {top3.length >= 1 && (
                      <div className="flex flex-col items-center flex-1 max-w-[130px] -mt-4">
                        <div className="relative mb-2">
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                            <span className="material-symbols-outlined text-[#EFC14B] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                          </div>
                          <img src={top3[0].userAvatar} alt={top3[0].userName} className="w-16 h-16 rounded-full border-3 border-[#EFC14B] object-cover shadow-xl" />
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#EFC14B] rounded-full flex items-center justify-center shadow">
                            <span className="text-[11px] font-bold text-[#0F1E44]">1</span>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-white truncate w-full text-center">{top3[0].userName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[#EFC14B] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold text-[#EFC14B]">{top3[0].avgScore.toFixed(1)}</span>
                        </div>
                        <div className="mt-1.5 px-2 py-0.5 bg-[#EFC14B]/20 rounded-full">
                          <span className="text-[9px] font-bold text-[#EFC14B]">Ngôi sao</span>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {top3.length >= 3 && (
                      <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="relative mb-2">
                          <img src={top3[2].userAvatar} alt={top3[2].userName} className="w-14 h-14 rounded-full border-3 border-[#CD7F32] object-cover shadow-lg" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#CD7F32] rounded-full flex items-center justify-center shadow">
                            <span className="text-[10px] font-bold text-white">3</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-white truncate w-full text-center">{top3[2].userName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[#CD7F32] text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-xs font-bold text-white">{top3[2].avgScore.toFixed(1)}</span>
                        </div>
                        <div className="mt-1.5 px-2 py-0.5 bg-[#CD7F32]/20 rounded-full">
                          <span className="text-[9px] font-bold text-[#CD7F32]">Nổi bật</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── REST OF LEADERBOARD (Rank 4+) ─── */}
              {restOfLeaderboard.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-[#E8DFD0]" />
                    <span className="text-[10px] text-[#7A829A] font-semibold">Xếp hạng tiếp theo</span>
                    <div className="flex-1 h-px bg-[#E8DFD0]" />
                  </div>
                  {restOfLeaderboard.map((entry) => {
                    const isMe = entry.userId === currentUser.id;
                    const badge = getRankBadge(entry.rank, entry.avgScore);
                    return (
                      <div
                        key={entry.userId}
                        className={`bg-white rounded-2xl border p-3 flex items-center gap-3 transition-all ${
                          isMe ? 'border-[#EFC14B] shadow-golden' : 'border-[#E8DFD0] shadow-sm'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#F5EDDF] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#7A829A]">#{entry.rank}</span>
                        </div>
                        <img src={entry.userAvatar} alt={entry.userName} className="w-9 h-9 rounded-full object-cover border border-[#E8DFD0]" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isMe ? 'text-[#EFC14B]' : 'text-[#0F1E44]'}`}>
                            {entry.userName} {isMe && '(Bạn)'}
                          </p>
                          <p className="text-[10px] text-[#7A829A]">
                            {entry.reviewCount} đánh giá · {entry.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                          </p>
                        </div>
                        {badge.title && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-gradient-to-r text-white rounded-full">{badge.title}</span>
                        )}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[#EFC14B] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="text-lg font-heading font-bold text-[#0F1E44]">{entry.avgScore.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Employees with 0 reviews */}
              {leaderboard.filter((e) => e.reviewCount === 0).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-[#E8DFD0]" />
                    <span className="text-[10px] text-[#7A829A] font-semibold">Chưa có đánh giá</span>
                    <div className="flex-1 h-px bg-[#E8DFD0]" />
                  </div>
                  {leaderboard.filter((e) => e.reviewCount === 0).map((entry) => {
                    const isMe = entry.userId === currentUser.id;
                    return (
                      <div
                        key={entry.userId}
                        className={`bg-white/60 rounded-2xl border border-[#E8DFD0]/50 p-3 flex items-center gap-3 opacity-60 ${
                          isMe ? 'border-[#EFC14B]/50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#F5EDDF] flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#7A829A] text-[16px]">person</span>
                        </div>
                        <img src={entry.userAvatar} alt={entry.userName} className="w-8 h-8 rounded-full object-cover border border-[#E8DFD0]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#7A829A] truncate">
                            {entry.userName} {isMe && '(Bạn)'}
                          </p>
                        </div>
                        <span className="text-xs text-[#7A829A]">—</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* TAB: HISTORY (Manager only)                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {activeTab === 'history' && isManager && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#0F1E44]">{peerReviews.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tổng đánh giá</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#EFC14B]">{uniqueTargets.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Được đánh giá</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E8DFD0] text-center">
              <p className="text-xl font-heading font-bold text-[#4CAF72]">{uniqueEvaluators.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Người đánh giá</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#EFC14B] text-xl">filter_list</span>
              <h3 className="text-sm font-bold text-[#0F1E44]">Bộ lọc</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Được đánh giá</label>
                <select
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                >
                  <option value="all">Tất cả</option>
                  {allTargets.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Người đánh giá</label>
                <select
                  value={filterEvaluator}
                  onChange={(e) => setFilterEvaluator(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                >
                  <option value="all">Tất cả</option>
                  {uniqueEvaluators.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {(filterTarget !== 'all' || filterEvaluator !== 'all') && (
              <button
                onClick={() => { setFilterTarget('all'); setFilterEvaluator('all'); }}
                className="mt-3 text-xs font-semibold text-[#EFC14B] hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Reviews list */}
          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3 block">rate_review</span>
                <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có đánh giá</h3>
                <p className="text-xs text-[#7A829A]">Không tìm thấy đánh giá phù hợp với bộ lọc.</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm hover:shadow-navy transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        <img src={review.evaluatorAvatar} alt={review.evaluatorName} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                        <div className="w-6 h-6 bg-[#EFC14B] rounded-full flex items-center justify-center z-10">
                          <span className="material-symbols-outlined text-[10px] text-[#0F1E44]">arrow_forward</span>
                        </div>
                        <img src={review.targetAvatar} alt={review.targetName} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                      </div>
                      <div>
                        <p className="text-xs text-[#7A829A]">
                          <span className="font-semibold text-[#0F1E44]">{review.evaluatorName}</span>
                          {' → '}
                          <span className="font-semibold text-[#0F1E44]">{review.targetName}</span>
                        </p>
                        <p className="text-[10px] text-[#7A829A]">{formatDate(review.dateString)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#EFC14B]/15 px-2 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[12px] text-[#EFC14B]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-xs font-bold text-[#0F1E44]">{review.avgScore.toFixed(1)}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-[#7A829A] bg-[#FDF8EE] rounded-lg px-3 py-2 mt-2">"{review.comment}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* REVIEW DETAIL MODAL (Manager only)                  */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedReview && isManager && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            <div className="p-5 border-b border-[#F5EDDF]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Chi tiết đánh giá</h3>
                <button onClick={() => setSelectedReview(null)} className="text-[#7A829A] hover:text-[#0F1E44]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  <img src={selectedReview.evaluatorAvatar} alt={selectedReview.evaluatorName} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                  <div className="w-7 h-7 bg-[#EFC14B] rounded-full flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-[12px] text-[#0F1E44]">arrow_forward</span>
                  </div>
                  <img src={selectedReview.targetAvatar} alt={selectedReview.targetName} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F1E44]">
                    {selectedReview.evaluatorName} → {selectedReview.targetName}
                  </p>
                  <p className="text-xs text-[#7A829A]">{formatDate(selectedReview.dateString)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold text-[#7A829A]">Tổng điểm:</span>
                <StarRating value={Math.round(selectedReview.avgScore)} readonly size="sm" />
                <span className="text-sm font-heading font-bold text-[#0F1E44]">{selectedReview.avgScore.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {PEER_REVIEW_CRITERIA.map((criteria) => {
                const answer = selectedReview.answers.find((a) => a.criteriaId === criteria.id);
                return (
                  <div key={criteria.id} className="bg-[#FDF8EE] rounded-xl p-3">
                    <p className="text-xs font-semibold text-[#0F1E44] mb-1">{criteria.question}</p>
                    <p className="text-[10px] text-[#7A829A] uppercase tracking-wider mb-2">{criteria.category}</p>
                    <StarRating value={answer?.stars || 0} readonly size="sm" />
                  </div>
                );
              })}

              {selectedReview.comment && (
                <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#0F1E44] mb-1">Nhận xét:</p>
                  <p className="text-sm text-[#3D4663] italic">"{selectedReview.comment}"</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#F5EDDF]">
              <button
                onClick={() => setSelectedReview(null)}
                className="w-full py-2.5 bg-[#0F1E44] text-white rounded-xl text-xs font-bold hover:bg-[#1A2D5A]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
