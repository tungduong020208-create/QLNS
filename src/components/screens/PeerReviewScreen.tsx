import React, { useState, useMemo } from 'react';
import { User, PeerReviewCriteria, PeerReviewSubmission } from '../../types';
import { PEER_REVIEW_CRITERIA } from '../../data/peerReviewData';

interface PeerReviewScreenProps {
  currentUser: User;
  allUsers: User[];
  peerReviews: PeerReviewSubmission[];
  onSubmitReview: (submission: PeerReviewSubmission) => void;
}

export const PeerReviewScreen: React.FC<PeerReviewScreenProps> = ({
  currentUser,
  allUsers,
  peerReviews,
  onSubmitReview,
}) => {
  // Employee view state
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Manager view state
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [filterEvaluator, setFilterEvaluator] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [selectedReview, setSelectedReview] = useState<PeerReviewSubmission | null>(null);

  const isManager = currentUser.role === 'manager';

  // Get list of employees (excluding current user) for employee view
  const availableTargets = useMemo(() => {
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [allUsers, currentUser.id]);

  // Check if current employee has already reviewed someone today
  const hasReviewedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return peerReviews.some(
      (r) => r.evaluatorId === currentUser.id && r.dateString === today
    );
  }, [peerReviews, currentUser.id]);

  // Filter reviews for manager view
  const filteredReviews = useMemo(() => {
    if (!isManager) return [];

    return peerReviews.filter((review) => {
      // Filter by target employee
      if (filterTarget !== 'all' && review.targetId !== filterTarget) return false;

      // Filter by evaluator
      if (filterEvaluator !== 'all' && review.evaluatorId !== filterEvaluator) return false;

      // Filter by date range
      if (filterDateFrom && review.dateString < filterDateFrom) return false;
      if (filterDateTo && review.dateString > filterDateTo) return false;

      return true;
    });
  }, [peerReviews, isManager, filterTarget, filterEvaluator, filterDateFrom, filterDateTo]);

  // Get unique evaluators and targets for filter dropdowns
  const uniqueEvaluators = useMemo(() => {
    const ids = new Set(peerReviews.map((r) => r.evaluatorId));
    return allUsers.filter((u) => ids.has(u.id));
  }, [peerReviews, allUsers]);

  const uniqueTargets = useMemo(() => {
    const ids = new Set(peerReviews.map((r) => r.targetId));
    return allUsers.filter((u) => ids.has(u.id));
  }, [peerReviews, allUsers]);

  const handleAnswerChange = (criteriaId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [criteriaId]: answer }));
  };

  const handleSubmit = () => {
    if (!selectedTarget) return;
    if (Object.keys(answers).length < PEER_REVIEW_CRITERIA.length) return;

    setIsSubmitting(true);

    const targetUser = allUsers.find((u) => u.id === selectedTarget);
    if (!targetUser) return;

    const now = new Date();
    const submission: PeerReviewSubmission = {
      id: `pr-${Date.now()}`,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      evaluatorAvatar: currentUser.avatar,
      targetId: selectedTarget,
      targetName: targetUser.name,
      targetAvatar: targetUser.avatar,
      answers: PEER_REVIEW_CRITERIA.map((c) => ({
        criteriaId: c.id,
        answer: answers[c.id] || '',
      })),
      comment: comment.trim() || undefined,
      submittedAt: now.toISOString(),
      dateString: now.toISOString().split('T')[0],
    };

    setTimeout(() => {
      onSubmitReview(submission);
      setIsSubmitting(false);
      setSuccessMessage('Gửi đánh giá thành công!');
      setSelectedTarget('');
      setAnswers({});
      setComment('');
      setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 600);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreSummary = (answers: { criteriaId: string; answer: string }[]) => {
    const goodCount = answers.filter(
      (a) => a.answer === 'Rất tốt' || a.answer === 'Xuất sắc' || a.answer === 'Luôn tuân thủ'
    ).length;
    return `${goodCount}/${answers.length}`;
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Đánh giá chéo</h2>
          <p className="text-xs text-[#7A829A] mt-0.5">
            {isManager
              ? 'Xem tổng hợp kết quả đánh giá chéo của tất cả nhân viên'
              : 'Đánh giá đồng nghiệp và đóng góp ý kiến xây dựng'}
          </p>
        </div>
        {!isManager && !hasReviewedToday && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            <span>Đánh giá mới</span>
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-[#4CAF72]/15 text-[#4CAF72] text-sm font-semibold rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Employee View */}
      {!isManager && (
        <>
          {/* Already reviewed today notice */}
          {hasReviewedToday && !showForm && (
            <div className="bg-[#EFC14B]/15 border border-[#EFC14B]/30 rounded-2xl p-5 text-center mb-6">
              <span className="material-symbols-outlined text-4xl text-[#EFC14B] mb-2 block">check_circle</span>
              <h3 className="font-heading font-bold text-[#0F1E44] mb-1">Đã đánh giá hôm nay</h3>
              <p className="text-xs text-[#7A829A]">Bạn đã gửi đánh giá chéo cho hôm nay. Hãy quay lại vào ngày mai!</p>
            </div>
          )}

          {/* Evaluation Form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Đánh giá đồng nghiệp</h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedTarget('');
                    setAnswers({});
                    setComment('');
                  }}
                  className="text-[#7A829A] hover:text-[#0F1E44]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Select target employee */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-[#0F1E44] mb-2">Chọn đồng nghiệp đánh giá</label>
                <select
                  value={selectedTarget}
                  onChange={(e) => setSelectedTarget(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] focus:border-[#EFC14B] focus:ring-1 focus:ring-[#EFC14B] outline-none"
                >
                  <option value="">-- Chọn đồng nghiệp --</option>
                  {availableTargets.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Evaluation criteria */}
              {selectedTarget && (
                <div className="space-y-4 mb-5">
                  <h4 className="text-sm font-bold text-[#0F1E44]">Tiêu chí đánh giá</h4>
                  {PEER_REVIEW_CRITERIA.map((criteria) => (
                    <div key={criteria.id} className="bg-[#FDF8EE] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0F1E44]">{criteria.question}</p>
                          <p className="text-[10px] text-[#7A829A] uppercase tracking-wider">{criteria.category}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {criteria.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => handleAnswerChange(criteria.id, option)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              answers[criteria.id] === option
                                ? 'bg-[#0F1E44] text-white shadow-sm'
                                : 'bg-white text-[#3D4663] border border-[#E8DFD0] hover:border-[#EFC14B]'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment */}
              {selectedTarget && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-[#0F1E44] mb-2">
                    Nhận xét thêm <span className="text-[#7A829A] font-normal">(tùy chọn)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Chia sẻ thêm nhận xét về đồng nghiệp..."
                    rows={3}
                    className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#EFC14B] focus:ring-1 focus:ring-[#EFC14B] outline-none resize-none"
                  />
                </div>
              )}

              {/* Submit button */}
              {selectedTarget && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.keys(answers).length < PEER_REVIEW_CRITERIA.length}
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
                      <span>Gửi đánh giá ({Object.keys(answers).length}/{PEER_REVIEW_CRITERIA.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Evaluation Criteria Preview */}
          {!showForm && !hasReviewedToday && (
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 shadow-sm mb-6">
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
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#7A829A] mt-4 text-center">
                Nhấn "Đánh giá mới" để bắt đầu đánh giá đồng nghiệp
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-2xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#EFC14B] text-xl mt-0.5">lock</span>
            <div>
              <h4 className="text-sm font-bold text-[#0F1E44] mb-1">Bảo mật đánh giá</h4>
              <p className="text-xs text-[#7A829A]">
                Kết quả đánh giá chéo được bảo mật. Bạn KHÔNG xem được đánh giá của người khác về mình hoặc về người khác.
                Chỉ quản lý mới có quyền xem tổng hợp.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Manager View */}
      {isManager && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
              <p className="text-2xl font-heading font-bold text-[#0F1E44]">{peerReviews.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Tổng đánh giá</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
              <p className="text-2xl font-heading font-bold text-[#EFC14B]">{uniqueTargets.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Nhân viên được đánh giá</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E8DFD0] text-center">
              <p className="text-2xl font-heading font-bold text-[#4CAF72]">{uniqueEvaluators.length}</p>
              <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Người đánh giá</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#EFC14B] text-xl">filter_list</span>
              <h3 className="text-sm font-bold text-[#0F1E44]">Bộ lọc</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Nhân viên được đánh giá</label>
                <select
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                >
                  <option value="all">Tất cả</option>
                  {uniqueTargets.map((u) => (
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
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A829A] mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs text-[#0F1E44] focus:border-[#EFC14B] outline-none"
                />
              </div>
            </div>
            {(filterTarget !== 'all' || filterEvaluator !== 'all' || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => {
                  setFilterTarget('all');
                  setFilterEvaluator('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="mt-3 text-xs font-semibold text-[#EFC14B] hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3">rate_review</span>
                <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có đánh giá nào</h3>
                <p className="text-xs text-[#7A829A]">Không tìm thấy đánh giá chéo phù hợp với bộ lọc.</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm hover:shadow-navy transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        <img
                          src={review.evaluatorAvatar}
                          alt={review.evaluatorName}
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        />
                        <div className="w-6 h-6 bg-[#EFC14B] rounded-full flex items-center justify-center z-10">
                          <span className="material-symbols-outlined text-[10px] text-[#0F1E44]">arrow_forward</span>
                        </div>
                        <img
                          src={review.targetAvatar}
                          alt={review.targetName}
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        />
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
                      <span className="material-symbols-outlined text-[12px] text-[#EFC14B]">star</span>
                      <span className="text-xs font-bold text-[#0F1E44]">{getScoreSummary(review.answers)}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-[#7A829A] bg-[#FDF8EE] rounded-lg px-3 py-2">"{review.comment}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Review Detail Modal (Manager only) */}
      {selectedReview && isManager && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-lg border border-[#E8DFD0]">
            {/* Header */}
            <div className="p-5 border-b border-[#F5EDDF]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Chi tiết đánh giá</h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-[#7A829A] hover:text-[#0F1E44]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2">
                  <img
                    src={selectedReview.evaluatorAvatar}
                    alt={selectedReview.evaluatorName}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                  <div className="w-7 h-7 bg-[#EFC14B] rounded-full flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-[12px] text-[#0F1E44]">arrow_forward</span>
                  </div>
                  <img
                    src={selectedReview.targetAvatar}
                    alt={selectedReview.targetName}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F1E44]">
                    {selectedReview.evaluatorName} → {selectedReview.targetName}
                  </p>
                  <p className="text-xs text-[#7A829A]">{formatDate(selectedReview.dateString)}</p>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {PEER_REVIEW_CRITERIA.map((criteria) => {
                const answer = selectedReview.answers.find((a) => a.criteriaId === criteria.id);
                return (
                  <div key={criteria.id} className="bg-[#FDF8EE] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#0F1E44]">{criteria.question}</p>
                        <p className="text-[10px] text-[#7A829A]">{criteria.category}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        answer?.answer === 'Rất tốt' || answer?.answer === 'Xuất sắc' || answer?.answer === 'Luôn tuân thủ'
                          ? 'bg-[#4CAF72]/15 text-[#4CAF72]'
                          : answer?.answer === 'Tốt' || answer?.answer === 'Đạt yêu cầu' || answer?.answer === 'Thường tuân thủ'
                          ? 'bg-[#EFC14B]/20 text-[#D4A833]'
                          : 'bg-[#FF3131]/10 text-[#FF3131]'
                      }`}>
                        {answer?.answer || 'Chưa trả lời'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {selectedReview.comment && (
                <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#0F1E44] mb-1">Nhận xét thêm:</p>
                  <p className="text-sm text-[#3D4663] italic">"{selectedReview.comment}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
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
