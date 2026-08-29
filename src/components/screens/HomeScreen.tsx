import React from 'react';
import { User, EvidenceItem, CheckInRecord } from '../../types';
import CheckInCheckOut from '../CheckInCheckOut';
import WorkSchedule from '../WorkSchedule';

interface HomeScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  onNavigateSubmit: () => void;
  onSelectEvidence: (evidence: EvidenceItem) => void;
  onNavigateReview?: () => void;
  checkInRecord?: CheckInRecord | null;
  onCheckIn?: (record: CheckInRecord) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  evidences,
  onNavigateSubmit,
  onSelectEvidence,
  onNavigateReview,
  checkInRecord,
  onCheckIn
}) => {
  // Filter evidence related to the current user, or show all if manager
  const userEvidences = currentUser.role === 'manager' 
    ? evidences 
    : evidences.filter(e => e.employeeId === currentUser.id);

  // Calculate scores
  const goodEvidences = userEvidences.filter(e => e.status === 'good');
  const badEvidences = userEvidences.filter(e => e.status === 'bad');
  
  const basePoints = 1000;
  const rewardPoints = 300 + goodEvidences.reduce((acc, curr) => acc + (curr.points > 0 ? curr.points : 15), 0) - 15; // baseline aligned with 300
  const penaltyPoints = 50 + Math.abs(badEvidences.reduce((acc, curr) => acc + (curr.points < 0 ? curr.points : 0), 0)) - 10;
  const totalScore = basePoints + rewardPoints - penaltyPoints;

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1b1b21] tracking-tight">
          Xin chào, {currentUser.name}
        </h1>
        <p className="text-sm text-[#454652] mt-1">
          {currentUser.role === 'manager' 
            ? 'Cập nhật tiến độ duyệt và hiệu suất toàn bộ nhân viên hôm nay' 
            : 'Cập nhật hiệu suất làm việc hôm nay'}
        </p>
      </div>

      {/* Check-In / Check-Out Section */}
      {currentUser.role === 'employee' && (
        <CheckInCheckOut
          employeeId={currentUser.id}
          onCheckIn={onCheckIn || (() => {})}
        />
      )}

      {/* Work Schedule Section */}
      {currentUser.role === 'employee' && (
        <WorkSchedule
          employeeId={currentUser.id}
          employeeName={currentUser.name}
        />
      )}

      {/* Bento Grid: Score Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total Net Score Card */}
        <div className="col-span-2 bg-[#000666] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          {/* Decorative ambient blur circle */}
          <div className="absolute -right-4 -top-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-8 w-28 h-28 bg-[#8999ff]/20 rounded-full blur-xl pointer-events-none" />
          
          <div className="text-xs uppercase tracking-wider font-semibold text-white/90 mb-2 z-10">
            TỔNG ĐIỂM HIỆN TẠI
          </div>
          <div className="font-headline text-4xl sm:text-5xl font-bold z-10 flex items-baseline gap-2">
            {totalScore.toLocaleString('vi-VN')}
            <span className="text-base sm:text-lg font-normal text-white/80">pts</span>
          </div>
        </div>

        {/* Breakdown: Rewards */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#4555b7] mb-2 font-semibold">
            <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
            <span className="text-xs uppercase tracking-wider">THƯỞNG</span>
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#000666]">
            +{rewardPoints}
          </div>
        </div>

        {/* Breakdown: Penalties */}
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#ba1a1a] mb-2 font-semibold">
            <span className="material-symbols-outlined text-sm font-bold">trending_down</span>
            <span className="text-xs uppercase tracking-wider">PHẠT</span>
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#ba1a1a]">
            -{penaltyPoints}
          </div>
        </div>
      </div>


    </div>
  );
};
