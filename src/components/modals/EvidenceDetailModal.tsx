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
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#c6c5d4] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#efecf5] flex items-center justify-between bg-[#fbf8ff]">
          <div className="flex items-center gap-3">
            <img
              src={evidence.employeeAvatar}
              alt={evidence.employeeName}
              className="w-9 h-9 rounded-full object-cover border border-[#c6c5d4]"
            />
            <div>
              <h3 className="font-headline font-bold text-sm text-[#000666]">{evidence.employeeName}</h3>
              <p className="text-[11px] text-[#767683]">{evidence.timestamp} • {evidence.department}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#767683] hover:text-[#1b1b21] p-1.5 rounded-full hover:bg-[#efecf5] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photo */}
          <div className="w-full rounded-xl overflow-hidden bg-black/5 border border-[#c6c5d4]/60 max-h-80 flex items-center justify-center">
            <img
              src={evidence.imageUrl}
              alt={evidence.title}
              className="w-full h-full object-contain max-h-80"
            />
          </div>

          {/* Title & Status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-headline text-lg font-bold text-[#1b1b21]">{evidence.title}</h2>
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-[#efecf5] text-[#454652]">
                {evidence.department}
              </span>
            </div>

            <div>
              {evidence.status === 'good' ? (
                <div className="text-right">
                  <span className="bg-[#dee0ff] text-[#000e5e] px-2.5 py-1 rounded font-bold text-xs uppercase">
                    Tốt
                  </span>
                  <div className="text-sm font-bold text-[#4555b7] mt-0.5">+{evidence.points || 15} pts</div>
                </div>
              ) : evidence.status === 'pending' ? (
                <span className="bg-[#e4e1ea] text-[#454652] px-2.5 py-1 rounded font-bold text-xs uppercase">
                  Chưa đánh giá
                </span>
              ) : (
                <div className="text-right">
                  <span className="bg-[#ffdad6] text-[#93000a] px-2.5 py-1 rounded font-bold text-xs uppercase">
                    Chưa tốt
                  </span>
                  <div className="text-sm font-bold text-[#ba1a1a] mt-0.5">{evidence.points || -10} pts</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#f5f2fb] p-3.5 rounded-xl border border-[#c6c5d4]/40">
            <div className="text-[11px] font-bold text-[#454652] uppercase mb-1">Mô tả công việc:</div>
            <p className="text-xs md:text-sm text-[#1b1b21] leading-relaxed">{evidence.description}</p>
          </div>

          {/* Reviewer Note */}
          {evidence.managerNote && (
            <div className="bg-[#dee0ff]/30 p-3.5 rounded-xl border border-[#8999ff]/30">
              <div className="text-[11px] font-bold text-[#000666] uppercase mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">rate_review</span>
                Nhận xét từ quản lý {evidence.reviewedBy ? `(${evidence.reviewedBy})` : ''}:
              </div>
              <p className="text-xs text-[#1b1b21] italic">"{evidence.managerNote}"</p>
            </div>
          )}

          {/* Manager Action buttons inside detail modal */}
          {currentUser.role === 'manager' && onQuickEvaluate && (
            <div className="pt-2 border-t border-[#efecf5]">
              <div className="text-[11px] font-bold text-[#454652] uppercase mb-2">Đánh giá nhanh:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onQuickEvaluate(evidence.id, 'good', 15, 'Đạt tiêu chuẩn xuất sắc');
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-[#000666] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-[#1a237e]"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Duyệt TỐT (+15)
                </button>
                <button
                  onClick={() => {
                    onQuickEvaluate(evidence.id, 'bad', -10, 'Chưa đạt yêu cầu, cần chấn chỉnh');
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-[#ba1a1a] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-red-700"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  CHƯA TỐT (-10)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#fbf8ff] border-t border-[#efecf5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#eae7ef] text-[#1b1b21] hover:bg-[#c6c5d4] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
