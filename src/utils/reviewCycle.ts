/**
 * reviewCycle — period-agnostic review quota helpers.
 *
 * The review requirement is "5 reviews per period". The period used to be
 * hard-coded as a calendar week (Mon–Sun) inside WeeklyReviewTracker; it is
 * now a parameter so the cycle can be flipped back without touching UI code.
 *
 * `computeReviewCycle` is the ONLY place that knows how a period's window is
 * computed. UI components receive counts/labels and render them — they never
 * do date arithmetic themselves.
 */

import { PeerReviewSubmission } from '../types';

/** Supported review cycles. */
export type ReviewPeriod = 'week' | 'month';

/** Minimum completed reviews per period (unchanged by the period switch). */
export const REQUIRED_REVIEWS = 5;

/** Get Monday 00:00 of the week containing `date`. */
export const getPeriodStart = (date: Date, period: ReviewPeriod): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const day = d.getDay(); // 0=Sun … 6=Sat
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  } else {
    d.setDate(1); // first day of month
  }
  return d;
};

/** Get last millisecond of the period containing `date`. */
export const getPeriodEnd = (date: Date, period: ReviewPeriod): Date => {
  const start = getPeriodStart(date, period);
  const end = new Date(start);
  if (period === 'week') {
    end.setDate(start.getDate() + 6);
  } else {
    // Day 0 of next month = last day of this month
    end.setMonth(start.getMonth() + 1, 0);
  }
  end.setHours(23, 59, 59, 999);
  return end;
};

/** Whole days left until the period ends (0 on the last day). */
export const getDaysLeftInPeriod = (date: Date, period: ReviewPeriod): number => {
  const end = getPeriodEnd(date, period);
  const msLeft = end.getTime() - date.getTime();
  return Math.max(0, Math.floor(msLeft / (24 * 60 * 60 * 1000)));
};

export interface ReviewCycleStatus {
  /** Reviews submitted by this user inside the current period. */
  reviewCount: number;
  /** Progress 0–100 towards REQUIRED_REVIEWS. */
  progress: number;
  /** Whole days remaining before the period resets. */
  daysLeft: number;
  /** True when fewer than ~3 days remain and quota is unmet. */
  isWarning: boolean;
  /** True when the quota is met for this period. */
  isComplete: boolean;
}

/** Count this user's completed reviews inside the current period window. */
export function computeReviewCycle(
  userId: string,
  peerReviews: PeerReviewSubmission[],
  period: ReviewPeriod,
  now: Date = new Date()
): ReviewCycleStatus {
  const start = getPeriodStart(now, period);
  const end = getPeriodEnd(now, period);

  const inPeriod = peerReviews.filter((r) => {
    if (r.evaluatorId !== userId) return false;
    const reviewDate = new Date(r.submittedAt);
    return reviewDate >= start && reviewDate <= end;
  });

  const reviewCount = inPeriod.length;
  const progress = Math.min((reviewCount / REQUIRED_REVIEWS) * 100, 100);
  const daysLeft = getDaysLeftInPeriod(now, period);
  const isWarning = reviewCount < REQUIRED_REVIEWS && daysLeft <= 2;
  const isComplete = reviewCount >= REQUIRED_REVIEWS;

  return { reviewCount, progress, daysLeft, isWarning, isComplete };
}
