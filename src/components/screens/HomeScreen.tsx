import React, { Suspense, lazy } from 'react';
import { User, CheckInRecord, PeerReviewSubmission } from '../../types';
import { Shift } from './ManagerScheduleScreen';
import { ManagerCheckInToggle } from '../ManagerCheckInToggle';
import WorkSchedule from '../WorkSchedule';
import { WeeklyReviewTracker } from '../WeeklyReviewTracker';

// LAZY: CheckInCheckOut (employee camera flow) pulls in face-api.js and the
// camera/PIN/GPS machinery — ~1.4k lines that managers never need. Vite
// splits it into its own chunk fetched only when an employee lands here.
const CheckInCheckOut = lazy(() => import('../CheckInCheckOut'));

interface HomeScreenProps {
  currentUser: User;
  peerReviews?: PeerReviewSubmission[];
  onCheckIn?: (record: CheckInRecord) => void;
  /** Published shift rows for the employee's schedule view. */
  shifts?: Shift[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  peerReviews = [],
  onCheckIn,
  shifts = [],
}) => {
  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      <div className="mb-6">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#0F1E44] tracking-tight">
          Xin chào, {currentUser.name}
        </h1>
        <p className="text-sm text-[#7A829A] mt-1">
          {currentUser.role === 'manager'
            ? 'Cập nhật tổng quan hiệu suất'
            : 'Điểm danh và theo dõi đánh giá từ khách hàng'}
        </p>
      </div>

      {currentUser.role === 'employee' && (
        <Suspense fallback={null}>
          <CheckInCheckOut employeeId={currentUser.id} onCheckIn={onCheckIn || (() => {})} />
        </Suspense>
      )}

      {/* Manager gets a dedicated check-in/check-out toggle (employee flow untouched) */}
      {currentUser.role === 'manager' && (
        <ManagerCheckInToggle employeeId={currentUser.id} onCheckIn={onCheckIn || (() => {})} />
      )}

      {currentUser.role === 'employee' && (
        <WorkSchedule employeeId={currentUser.id} employeeName={currentUser.name} shifts={shifts} />
      )}

      {currentUser.role === 'employee' && (
        <WeeklyReviewTracker userId={currentUser.id} peerReviews={peerReviews} className="mb-6" />
      )}

    </div>
  );
};
