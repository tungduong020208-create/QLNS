/**
 * useReviews — peer review submissions (đánh giá chéo).
 *
 * Owns: STORAGE_KEY_PEER_REVIEWS
 */

import { PeerReviewSubmission } from '../types';
import { INITIAL_PEER_REVIEWS } from '../data/peerReviewData';
import { STORAGE_KEY_PEER_REVIEWS } from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export function useReviews() {
  const [peerReviews, setPeerReviews] = usePersistentState<PeerReviewSubmission[]>(
    STORAGE_KEY_PEER_REVIEWS,
    INITIAL_PEER_REVIEWS
  );

  const submitPeerReview = (submission: PeerReviewSubmission) => {
    setPeerReviews(prev => [submission, ...prev]);
  };

  return { peerReviews, submitPeerReview };
}
