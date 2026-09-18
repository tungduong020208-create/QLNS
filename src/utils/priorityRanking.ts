/**
 * priorityRanking — Pure function for ranking shift candidates when
 * oversubscription occurs (more registrants than available slots).
 *
 * TWO priority criteria, applied sequentially:
 *   1. Timestamp: earlier submit → higher priority (first-come-first-served)
 *   2. Work hours: fewer total hours in the period → higher priority (fairness)
 *
 * Tie-break: when two candidates have identical timestamps AND identical
 * hours, the one appearing first in the input array wins (preserving
 * original registration order as the ultimate tiebreaker).
 *
 * This module is PURE (no React, no storage) — testable in isolation.
 */

// ─── Types ───────────────────────────────────────────────

export interface Candidate {
  userId: string;
  /** ISO timestamp of when the employee submitted their registration. */
  submittedAt: string;
}

export interface RankedCandidate extends Candidate {
  /** Total hours worked in the current evaluation period (week or month). */
  totalHours: number;
  /** Position in the final ranking (0 = highest priority). */
  rank: number;
}

export interface RankingResult {
  /** Candidates selected for the shift (first N = slotCapacity). */
  selected: RankedCandidate[];
  /** Candidates NOT selected — with explanation for each. */
  rejected: RejectedCandidate[];
}

export interface RejectedCandidate extends RankedCandidate {
  /** Human-readable reason why this candidate was not placed. */
  reason: RejectionReason;
}

export type RejectionReason =
  | 'registered_later'
  | 'more_hours_worked'
  | 'same_priority_not_enough_slots';

// ─── Core Ranking Function ───────────────────────────────

/**
 * Rank candidates for a single shift slot and split into selected / rejected.
 *
 * @param candidates     Employees who registered for this shift (with timestamps).
 * @param workHoursMap   Map<userId, totalHours> — hours worked in the current
 *                       evaluation period (week or month). Used for fairness
 *                       when timestamps are equal.
 * @param slotCapacity   How many people this shift needs.
 * @returns              { selected, rejected } with ranking info and reasons.
 */
export function rankCandidates(
  candidates: Candidate[],
  workHoursMap: Map<string, number>,
  slotCapacity: number
): RankingResult {
  if (candidates.length === 0) {
    return { selected: [], rejected: [] };
  }

  // Enrich candidates with hours data and sort by priority
  const enriched: RankedCandidate[] = candidates.map((c, idx) => ({
    ...c,
    totalHours: workHoursMap.get(c.userId) ?? 0,
    rank: idx, // temporary, will be reassigned after sort
  }));

  // Sort by priority:
  //   1. submittedAt ASC (earlier = higher priority)
  //   2. totalHours ASC (fewer hours = higher priority — fairness)
  //   3. original index ASC (tie-break: first in array wins)
  enriched.sort((a, b) => {
    // Primary: timestamp (earlier is better)
    const timeDiff = a.submittedAt.localeCompare(b.submittedAt);
    if (timeDiff !== 0) return timeDiff;

    // Secondary: fewer hours worked is better (fairness)
    if (a.totalHours !== b.totalHours) return a.totalHours - b.totalHours;

    // Tie-break: preserve original input order
    return a.rank - b.rank;
  });

  // Reassign ranks after sorting
  enriched.forEach((c, i) => { c.rank = i; });

  // Split into selected (top N) and rejected (the rest)
  const selected = enriched.slice(0, slotCapacity);
  const rejectedRaw = enriched.slice(slotCapacity);

  // Assign rejection reasons
  const rejected: RejectedCandidate[] = rejectedRaw.map((c) => {
    let reason: RejectionReason;

    // Check if this candidate was beaten purely by timestamp
    const earlierCandidateSelected = selected.some(
      (s) => s.submittedAt < c.submittedAt
    );
    if (earlierCandidateSelected) {
      reason = 'registered_later';
      return { ...c, reason };
    }

    // Check if this candidate was beaten by hours (same timestamp range)
    const sameTimeRejected = selected.some(
      (s) => s.submittedAt === c.submittedAt && s.totalHours < c.totalHours
    );
    if (sameTimeRejected) {
      reason = 'more_hours_worked';
      return { ...c, reason };
    }

    // Default: not enough slots (all selected candidates are equally qualified
    // but there simply aren't enough spots)
    reason = 'same_priority_not_enough_slots';
    return { ...c, reason };
  });

  return { selected, rejected };
}

// ─── Helpers for Work Hours Calculation ──────────────────

/**
 * Calculate total work hours for each employee within a date range.
 *
 * @param shifts       All shift rows in the unified store.
 * @param startDate    Start of evaluation period (YYYY-MM-DD, inclusive).
 * @param endDate      End of evaluation period (YYYY-MM-DD, inclusive).
 * @returns            Map<employeeId, totalHours>
 */
export function buildWorkHoursMap(
  shifts: { employeeId: string; date: string; startTime: string; endTime: string; status: string }[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const map = new Map<string, number>();

  const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  for (const s of shifts) {
    if (s.status === 'cancelled') continue;
    if (s.date < startDate || s.date > endDate) continue;

    const mins = toMinutes(s.endTime) - toMinutes(s.startTime);
    const hours = mins > 0 ? mins / 60 : 0;
    map.set(s.employeeId, (map.get(s.employeeId) ?? 0) + hours);
  }

  return map;
}

/**
 * Get the Monday of the current week (evaluation period for weekly fairness).
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return { start: fmt(monday), end: fmt(sunday) };
}

/**
 * Format a rejection reason into a human-readable Vietnamese string.
 */
export function formatRejectionReason(reason: RejectionReason): string {
  switch (reason) {
    case 'registered_later':
      return 'Đăng ký sau người khác';
    case 'more_hours_worked':
      return 'Đã có nhiều giờ làm hơn trong kỳ';
    case 'same_priority_not_enough_slots':
      return 'Ca đã đủ người — chờ slot trống';
  }
}
