/**
 * useEvidences — the evidence (minh chứng) domain: submissions, reviews, points.
 *
 * Owns: STORAGE_KEY_EVIDENCES
 * Cross-domain actions (creating a review notification, toasting) are NOT
 * done here — the hook returns what happened so App can orchestrate those.
 */

import { EvidenceItem } from '../types';
import { INITIAL_EVIDENCES } from '../data/initialData';
import { STORAGE_KEY_EVIDENCES } from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export interface ReviewDecision {
  evidenceId: string;
  status: 'good' | 'bad';
  points: number;
  note: string;
  /** Display name of the reviewing manager (stored on the evidence). */
  reviewerName: string;
}

export function useEvidences() {
  const [evidences, setEvidences] = usePersistentState<EvidenceItem[]>(
    STORAGE_KEY_EVIDENCES,
    INITIAL_EVIDENCES
  );

  /** Employee (or manager) submits new evidence; newest first. */
  const submitEvidence = (newEvidence: EvidenceItem) => {
    setEvidences(prev => [newEvidence, ...prev]);
  };

  /** Manager review: writes decision fields onto the evidence item. */
  const reviewEvidence = ({ evidenceId, status, points, note, reviewerName }: ReviewDecision) => {
    const reviewTime = `Hôm nay, ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    setEvidences(prev =>
      prev.map(item =>
        item.id === evidenceId
          ? { ...item, status, points, managerNote: note, reviewedAt: reviewTime, reviewedBy: reviewerName }
          : item
      )
    );
  };

  return { evidences, submitEvidence, reviewEvidence };
}
