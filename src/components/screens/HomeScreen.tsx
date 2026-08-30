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

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="col-span-2 bg-[#000666] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -top-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-8 w-28 h-28 bg-[#8999ff]/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between z-10">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-white/90 mb-2">
                DIEM DANH GIA KHACH HANG
              </div>
              <div className="font-headline text-4xl sm:text-5xl font-bold flex items-baseline gap-2">
                {totalPoints.toLocaleString('vi-VN')}
                <span className="text-base sm:text-lg font-normal text-white/80">pts</span>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{todayGood}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/80">Hom nay</div>
            </div>
          </div>
          <div className="mt-4 z-10">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="material-symbols-outlined text-sm">info</span>
              Moi khach hang quet QR danh gia = +1 diem
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#4555b7] mb-2 font-semibold">
            <span className="material-symbols-outlined text-sm font-bold">thumb_up</span>
            <span className="text-xs uppercase tracking-wider">TOT</span>
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#000666]">
            +{goodCount}
          </div>
        </div>
        <div className="bg-white border border-[#c6c5d4]/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#ba1a1a] mb-2 font-semibold">
            <span className="material-symbols-outlined text-sm font-bold">thumb_down</span>
            <span className="text-xs uppercase tracking-wider">CHUA TOT</span>
          </div>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#ba1a1a]">
            -{badCount}
          </div>
        </div>
      </div>
      {currentUser.role === 'employee' && (
        <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-6 shadow-sm mb-6 text-center">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="material-symbols-outlined text-[#000666]">qr_code_2</span>
            <h3 className="font-headline font-bold text-[#1b1b21]">Ma QR danh gia</h3>
          </div>
          <p className="text-xs text-[#454652] mb-4">Khach hang quet ma nay de danh gia ban</p>
          <div className="w-40 h-40 mx-auto bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 mb-3">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-gray-400">qr_code_2</span>
              <p className="text-[10px] text-gray-400 mt-1">QR Code</p>
            </div>
          </div>
          <div className="bg-[#f0f0ff] rounded-lg p-3">
            <p className="text-xs text-[#4555b7] font-medium">Khach hang quet - Chon danh gia - Ban nhan +1 diem</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#c6c5d4]/60 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[#000666]">rate_review</span>
          <h3 className="font-headline font-bold text-[#1b1b21]">Danh gia gan day</h3>
          <span className="ml-auto text-xs text-[#454652] bg-gray-100 px-2 py-0.5 rounded-full">
            {myRatings.length} danh gia
          </span>
        </div>
        {recentRatings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="material-symbols-outlined text-4xl">inbox</span>
            <p className="text-sm mt-2">Chua co danh gia nao</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRatings.map((rating) => (
              <div key={rating.id} className="flex items-start gap-3 p-3 bg-[#fafafa] rounded-xl">
                <div className={'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ' + (rating.rating === 'good' ? 'bg-green-100 text-green-600' : rating.rating === 'bad' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500')}>
                  <span className="material-symbols-outlined text-sm">
                    {rating.rating === 'good' ? 'thumb_up' : rating.rating === 'bad' ? 'thumb_down' : 'do_not_disturb_on'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1b1b21]">{rating.customerName}</span>
                    <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (rating.rating === 'good' ? 'bg-green-100 text-green-700' : rating.rating === 'bad' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600')}>
                      {rating.rating === 'good' ? '+1' : rating.rating === 'bad' ? '-1' : '0'}
                    </span>
                  </div>
                  {rating.comment && (<p className="text-xs text-[#454652] mt-1 line-clamp-2">"{rating.comment}"</p>)}
                  <p className="text-[10px] text-gray-400 mt-1">{rating.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
