import React from 'react';
import { User, EvidenceItem, CheckInRecord, CustomerRating } from '../../types';
import CheckInCheckOut from '../CheckInCheckOut';
import WorkSchedule from '../WorkSchedule';

interface HomeScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  customerRatings: CustomerRating[];
  onNavigateSubmit: () => void;
  onSelectEvidence: (evidence: EvidenceItem) => void;
  onNavigateReview?: () => void;
  checkInRecord?: CheckInRecord | null;
  onCheckIn?: (record: CheckInRecord) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  evidences,
  customerRatings,
  onCheckIn
}) => {
  const myRatings = currentUser.role === 'manager'
    ? customerRatings
    : customerRatings.filter(r => r.employeeId === currentUser.id);

  const goodCount = myRatings.filter(r => r.rating === 'good').length;
  const badCount = myRatings.filter(r => r.rating === 'bad').length;
  const totalPoints = goodCount - badCount;

  const today = new Date().toISOString().slice(0, 10);
  const todayRatings = myRatings.filter(r => r.dateString.startsWith(today));
  const todayGood = todayRatings.filter(r => r.rating === 'good').length;

  const recentRatings = [...myRatings]
    .sort((a, b) => new Date(b.dateString).getTime() - new Date(a.dateString).getTime())
    .slice(0, 5);

  return (    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      <div className="mb-6">
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1b1b21] tracking-tight">
          Xin chao, {currentUser.name}
        </h1>
        <p className="text-sm text-[#454652] mt-1">
          {currentUser.role === 'manager'
            ? 'Cap nhat tong quan hieu suat'
            : 'Diem danh va theo doi danh gia tu khach hang'}
        </p>
      </div>

      {currentUser.role === 'employee' && (
        <CheckInCheckOut employeeId={currentUser.id} onCheckIn={onCheckIn || (() => {})} />
      )}

      {currentUser.role === 'employee' && (
        <WorkSchedule employeeId={currentUser.id} employeeName={currentUser.name} />
      )}

    </div>
  );
};
