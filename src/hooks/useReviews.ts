/**
 * useReviews — peer review submissions (đánh giá chéo).
 *
 * Owns: STORAGE_KEY_PEER_REVIEWS
 */

import { PeerReviewSubmission } from '../types';
import { useEffect } from 'react';
import { INITIAL_PEER_REVIEWS, LEGACY_PEER_REVIEW_SEED_IDS } from '../data/peerReviewData';
import { STORAGE_KEY_PEER_REVIEWS } from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export function useReviews() {
  const [peerReviews, setPeerReviews] = usePersistentState<PeerReviewSubmission[]>(
    STORAGE_KEY_PEER_REVIEWS,
    INITIAL_PEER_REVIEWS
  );

  // Seed migration: browser nào lưu ĐÚNG bộ seed cũ (chưa từng có đánh giá
  // từ người dùng — id người dùng luôn dạng `pr-<timestamp>-<userId>` nên
  // không bao giờ nằm trong LEGACY_PEER_REVIEW_SEED_IDS) sẽ được nâng cấp
  // lên seed mới giàu dữ liệu hơn để bảng xếp hạng có nội dung. Storage đã
  // có thao tác của người dùng (thêm/xóa) được giữ nguyên vẹn.
  useEffect(() => {
    if (peerReviews.length !== LEGACY_PEER_REVIEW_SEED_IDS.size) return;
    if (!peerReviews.every((r) => LEGACY_PEER_REVIEW_SEED_IDS.has(r.id))) return;
    setPeerReviews(INITIAL_PEER_REVIEWS);
  }, [peerReviews, setPeerReviews]);

  const submitPeerReview = (submission: PeerReviewSubmission) => {
    setPeerReviews(prev => [submission, ...prev]);
  };

  return { peerReviews, submitPeerReview };
}
