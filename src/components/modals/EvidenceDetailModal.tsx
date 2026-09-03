import React from 'react';
import { EvidenceItem, User } from '../../types';

interface EvidenceDetailModalProps {
  evidence: EvidenceItem | null;
  currentUser: User;
  onClose: () => void;
  onQuickEvaluate?: (evidenceId: string, status: 'good' | 'bad', points: number, note: string) => void;
}

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  evidence,
  currentUser,
  onClose,
  onQuickEvaluate
}) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#E8DFD0] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#F5EDDF] flex items-center justify-between bg-[#FDF8EE]">
          <div className="flex items-center gap-3">
            <img
              src={evidence.employeeAvatar}
              alt={evidence.employeeName}
              className="w-9 h-9 rounded-full object-cover border border-[#E8DFD0]"
            />
            <div>
              <h3 className="font-heading font-bold text-sm text-[#0F1E44]">{evidence.employeeName}</h3>
              <p className="text-[11px] text-[#7A829A]">{evidence.timestamp}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A829A] hover:text-[#0F1E44] p-1.5 rounded-full hover:bg-[#F5EDDF] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photo */}
          <div className="w-full rounded-xl overflow-hidden bg-black/5 border border-[#E8DFD0]/60 max-h-80 flex items-center justify-center">
            <img
              src={evidence.imageUrl}
              alt={evidence.title}
              className="w-full h-full object-contain max-h-80"
            />
          </div>

          {/* Title & Status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-bold text-[#0F1E44]">{evidence.title}</h2>
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-[#F5EDDF] text-[#7A829A]">
                {evidence.employeeName}
              </span>
            </div>

            <div>
              {evidence.status === 'good' ? (
                <div className="text-right">
                  <span className="bg-[rgba(239,193,75,0.15)] text-[#0F1E44] px-2.5 py-1 rounded font-bold text-xs uppercase">
                    Tốt
                  </span>
                  <div className="text-sm font-bold text-[#4555b7] mt-0.5">+{evidence.points || 15} pts</div>
                </div>
              ) : evidence.status === 'pending' ? (
                <span className="bg-[#E8DFD0] text-[#7A829A] px-2.5 py-1 rounded font-bold text-xs uppercase">
                  Chưa đánh giá
                </span>
              ) : (
                <div className="text-right">
                  <span className="bg-[rgba(255,49,49,0.12)] text-[#FF3131] px-2.5 py-1 rounded font-bold text-xs uppercase">
                    Chưa tốt
                  </span>
                  <div className="text-sm font-bold text-[#FF3131] mt-0.5">{evidence.points || -10} pts</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#FDF8EE] p-3.5 rounded-xl border border-[#E8DFD0]/40">
            <div className="text-[11px] font-bold text-[#7A829A] uppercase mb-1">Mô tả công việc:</div>
            <p className="text-xs md:text-sm text-[#0F1E44] leading-relaxed">{evidence.description}</p>
          </div>

          {/* Reviewer Note */}
          {evidence.managerNote && (
            <div className="bg-[rgba(239,193,75,0.15)]/30 p-3.5 rounded-xl border border-[#EFC14B]/30">
              <div className="text-[11px] font-bold text-[#0F1E44] uppercase mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">rate_review</span>
                Nhận xét từ quản lý {evidence.reviewedBy ? `(${evidence.reviewedBy})` : ''}:
              </div>
              <p className="text-xs text-[#0F1E44] italic">"{evidence.managerNote}"</p>
            </div>
          )}

          {/* Manager Action buttons inside detail modal */}
          {currentUser.role === 'manager' && onQuickEvaluate && (
            <div className="pt-2 border-t border-[#F5EDDF]">
              <div className="text-[11px] font-bold text-[#7A829A] uppercase mb-2">Đánh giá nhanh:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onQuickEvaluate(evidence.id, 'good', 15, 'Đạt tiêu chuẩn xuất sắc');
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-[#0F1E44] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-[#1a237e]"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Duyệt TỐT (+15)
                </button>
                <button
                  onClick={() => {
                    onQuickEvaluate(evidence.id, 'bad', -10, 'Chưa đạt yêu cầu, cần chấn chỉnh');
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-[#FF3131] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-red-700"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  CHƯA TỐT (-10)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FDF8EE] border-t border-[#F5EDDF] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#eae7ef] text-[#0F1E44] hover:bg-[#E8DFD0] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
