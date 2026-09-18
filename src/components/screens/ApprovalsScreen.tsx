/**
 * ApprovalsScreen — hàng chờ duyệt bài Bảng Tin (manager-only).
 *
 * Tách route theo đúng nguyên tắc "tách route trước khi tách code": Bảng Tin
 * là không gian xã hội (đăng/cảm xúc/bình luận), còn DUYỆT là hàng đợi công
 * việc của quản lý — 2 mục đích dùng, 2 màn hình. Component này KHÔNG tạo
 * luồng dữ liệu mới: nhận đúng EvidenceItem + callback duyệt của App
 * (handleReviewEvidence), và "Chi tiết" mở EvidenceDetailModal có sẵn
 * (trước đây là UI chết — không còn chỗ nào mở được nó).
 */

import React, { useMemo, useState } from 'react';
import { EvidenceItem, User } from '../../types';

interface ApprovalsScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  /** Same contract as EvidenceDetailModal's onQuickEvaluate → App.handleReviewEvidence */
  onEvaluate: (evidenceId: string, status: 'good' | 'bad', points: number, note: string) => void;
  /** Opens the shared EvidenceDetailModal (owned by App). */
  onOpenDetail: (evidence: EvidenceItem) => void;
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  currentUser,
  evidences,
  onEvaluate,
  onOpenDetail,
}) => {
  const [filter, setFilter] = useState<'pending' | 'reviewed'>('pending');

  const pending = useMemo(
    () => evidences.filter((e) => e.status === 'pending').sort(
      (a, b) => new Date(b.dateString).getTime() - new Date(a.dateString).getTime()
    ),
    [evidences]
  );

  const reviewed = useMemo(
    () => evidences.filter((e) => e.status !== 'pending').sort(
      (a, b) => new Date(b.dateString).getTime() - new Date(a.dateString).getTime()
    ),
    [evidences]
  );

  const { goodCount, badCount } = useMemo(
    () => ({
      goodCount: evidences.filter((e) => e.status === 'good').length,
      badCount: evidences.filter((e) => e.status === 'bad').length,
    }),
    [evidences]
  );

  const list = filter === 'pending' ? pending : reviewed;

  const fmtDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Hôm nay, ${time}`;
    return `${d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}, ${time}`;
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      <div className="mb-5">
        <h1 className="font-heading text-xl md:text-2xl font-bold text-[#0F1E44]">Duyệt bài Bảng Tin</h1>
        <p className="text-sm text-[#7A829A]">
          {filter === 'pending'
            ? `${pending.length} bài đang chờ duyệt`
            : `Đã duyệt: ${goodCount} tốt · ${badCount} chưa tốt`}
        </p>
      </div>

      {/* Filter: pending queue vs reviewed history */}
      <div className="flex gap-2 mb-4 bg-[#F5EDDF] rounded-xl p-1">
        <button
          onClick={() => setFilter('pending')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'pending' ? 'bg-[#0F1E44] text-white shadow-sm' : 'text-[#7A829A] hover:text-[#0F1E44]'
          }`}
        >
          Chờ duyệt ({pending.length})
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            filter === 'reviewed' ? 'bg-[#0F1E44] text-white shadow-sm' : 'text-[#7A829A] hover:text-[#0F1E44]'
          }`}
        >
          Đã duyệt ({goodCount + badCount})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center text-sm shadow-sm">
          <span className={`material-symbols-outlined text-5xl mb-3 ${filter === 'pending' ? 'text-[#4CAF72]' : 'text-[#E8DFD0]'}`}>
            {filter === 'pending' ? 'task_alt' : 'history'}
          </span>
          <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">
            {filter === 'pending' ? 'Không có bài chờ duyệt' : 'Chưa có bài nào được duyệt'}
          </h3>
          <p className="text-xs text-[#7A829A]">
            {filter === 'pending' ? 'Tất cả bài đăng đã được xử lý.' : 'Các bài đã duyệt sẽ xuất hiện ở đây.'}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {list.map((item) => {
            const isPending = item.status === 'pending';
            return (
              <article
                key={item.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3 ${
                  isPending ? 'border-[#EFC14B]/50' : 'border-[#E8DFD0]/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E8DFD0] flex-shrink-0">
                    <img className="w-full h-full object-cover" src={item.employeeAvatar} alt={item.employeeName} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-[#0F1E44] block truncate">{item.employeeName}</span>
                    <span className="text-xs text-[#7A829A]">{fmtDate(item.dateString)}</span>
                  </div>
                  {isPending ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFC14B]/20 text-[#D4A833]">Chờ duyệt</span>
                  ) : item.status === 'good' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4CAF72]/15 text-[#4CAF72]">Tốt +{item.points}</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF3131]/15 text-[#FF3131]">Chưa tốt {item.points}</span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#0F1E44]">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-[#7A829A] leading-relaxed">{item.description}</p>
                  )}
                </div>

                {item.imageUrl && (
                  <div className="w-full rounded-xl overflow-hidden bg-[#F5EDDF] border border-[#E8DFD0]/60 flex items-center justify-center">
                    <img
                      className="max-w-full max-h-56 w-auto h-auto object-contain"
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                    />
                  </div>
                )}

                {item.managerNote && (
                  <p className="text-xs text-[#7A829A] italic">
                    Nhận xét {item.reviewedBy ? `(${item.reviewedBy})` : ''}: "{item.managerNote}"
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[#E8DFD0]/40">
                  <button
                    onClick={() => onOpenDetail(item)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-[#0F1E44] border border-[#E8DFD0] hover:bg-[#FDF8EE] transition-colors"
                  >
                    Chi tiết
                  </button>
                  {isPending && (
                    <>
                      <button
                        onClick={() => onEvaluate(item.id, 'good', 15, 'Đạt tiêu chuẩn xuất sắc')}
                        className="flex-1 py-2 bg-[#0F1E44] text-white rounded-xl text-xs font-bold hover:bg-[#1A2D5A] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] align-middle">check_circle</span> Duyệt TỐT (+15)
                      </button>
                      <button
                        onClick={() => onEvaluate(item.id, 'bad', -10, 'Chưa đạt yêu cầu, cần chấn chỉnh')}
                        className="flex-1 py-2 bg-[#FF3131] text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] align-middle">cancel</span> CHƯA TỐT (-10)
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
