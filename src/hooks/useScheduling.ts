/**
 * useScheduling — weekly schedule planning domain.
 *
 * Owns three related stores:
 *   STORAGE_KEY_SHIFT_REGISTRATIONS → employee-submitted weekly availability
 *   STORAGE_KEY_STUDY_SCHEDULES     → employee weekly study schedules
 *   STORAGE_KEY_MANUAL_ASSIGNMENTS  → manager-published weekly schedules
 */

import { WeeklyShiftRegistration, StudySchedule, ManualShiftAssignment } from '../types';
import {
  STORAGE_KEY_SHIFT_REGISTRATIONS,
  STORAGE_KEY_STUDY_SCHEDULES,
  STORAGE_KEY_MANUAL_ASSIGNMENTS,
} from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export function useScheduling() {
  const [shiftRegistrations, setShiftRegistrations] = usePersistentState<WeeklyShiftRegistration[]>(
    STORAGE_KEY_SHIFT_REGISTRATIONS,
    []
  );
  const [studySchedules, setStudySchedules] = usePersistentState<StudySchedule[]>(
    STORAGE_KEY_STUDY_SCHEDULES,
    []
  );
  const [manualAssignments, setManualAssignments] = usePersistentState<ManualShiftAssignment[]>(
    STORAGE_KEY_MANUAL_ASSIGNMENTS,
    []
  );

  const submitRegistration = (reg: WeeklyShiftRegistration) => {
    setShiftRegistrations(prev => [...prev, reg]);
  };

  const updateRegistration = (reg: WeeklyShiftRegistration) => {
    setShiftRegistrations(prev => prev.map(r => r.id === reg.id ? reg : r));
  };

  /** One study schedule per (user, weekStart) — resubmitting replaces it. */
  const submitStudySchedule = (schedule: StudySchedule) => {
    setStudySchedules(prev => {
      const existing = prev.find(s => s.userId === schedule.userId && s.weekStart === schedule.weekStart);
      if (existing) {
        return prev.map(s => s.id === existing.id ? schedule : s);
      }
      return [...prev, schedule];
    });
  };

  /** One published schedule per (user, weekStart) — republishing replaces it. */
  const publishSchedule = (assignment: ManualShiftAssignment) => {
    setManualAssignments(prev => {
      const existing = prev.find(a => a.userId === assignment.userId && a.weekStart === assignment.weekStart);
      if (existing) {
        return prev.map(a => a.id === existing.id ? assignment : a);
      }
      return [...prev, assignment];
    });
  };

  return {
    shiftRegistrations, submitRegistration, updateRegistration,
    studySchedules, submitStudySchedule,
    manualAssignments, publishSchedule,
  };
}
