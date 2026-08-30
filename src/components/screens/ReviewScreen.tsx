import React, { useState } from 'react';
import { User, EvidenceItem } from '../../types';

interface ReviewScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  onReactEvidence?: (evidenceId: string, reactionType: 'good' | 'bad') => void;
  onReviewEvidence?: (evidenceId: string, status: 'good' | 'bad', points: number, note: string) => void;
  onSelectEvidence?: (evidence: EvidenceItem) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  currentUser,
  evidences,
  onReactEvidence,
  onReviewEvidence,
  onSelectEvidence
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isManager = currentUser.role === 'manager';
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewPoints, setReviewPoints] = useState(10);

  const sortedEvidences = [...evidences].sort((a, b) => {
    return new Date(b.dateString).getTime() - new Date(a.dateString).getTime();
  });

  const filteredEvidences = sortedEvidences.filter(item => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return item.employeeName.toLowerCase().includes(s) || item.title.toLowerCase().includes(s) || item.department.toLowerCase().includes(s);
  });

  const getCounts = (item: EvidenceItem) => {
    const r = item.reactions || [];
    return { good: r.filter(x => x.type === 'good').length, bad: r.filter(x => x.type === 'bad').length };
  };

  const submitReview = (id: string, status: 'good'|'bad') => {
    if (onReviewEvidence) {
      onReviewEvidence(id, status, reviewPoints, reviewNote || (status === 'good' ? 'Đạt yêu cầu' : 'Cần xử lý'));
    }
    setReviewingId(null);
    setReviewNote('');
  };

  const getUserReaction = (item: EvidenceItem): 'good' | 'bad' | null => {
    const r = (item.reactions || []).find(x => x.userId === currentUser.id);
    return r?.type || null;
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      <section className="mb-6">
        <h2 className="font-headline text-2xl font-bold text-[#1b1b21]">Bảng tin minh chứng</h2>
        <p className="text-xs text-[#454652] mt-0.5">Xem và đánh giá minh chứng của tất cả nhân viên</p>
        <div className="relative w-full mt-4">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#454652] text-[20px]">search</span>
          <input className="w-full bg-white border border-[#c6c5d4] text-[#1b1b21] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666] transition-colors placeholder:text-[#767683] shadow-sm"
            placeholder="Tìm kiếm nhân viên, ca làm..." type="text"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#767683] hover:text-[#1b1b21]">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        {filteredEvidences.length === 0 ? (
          <div className="bg-white border border-[#c6c5d4]/50 rounded-2xl p-10 text-center text-sm text-[#454652] shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#c6c5d4] mb-3">feed</span>
            <h3 className="font-headline font-bold text-base text-[#1b1b21] mb-1">Chưa có minh chứng nào</h3>
            <p className="text-xs text-[#767683]">Hãy là người đầu tiên nộp minh chứng!</p>
          </div>
        ) : (
          filteredEvidences.map((item) => {
            const { good: goodCount, bad: badCount } = getCounts(item);
            const userReaction = getUserReaction(item);
            return (
              <article key={item.id} className="bg-white border border-[#c6c5d4]/70 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c6c5d4] flex-shrink-0">
                    <img className="w-full h-full object-cover" src={item.employeeAvatar} alt={item.employeeName} />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm md:text-base text-[#1b1b21] block">{item.employeeName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#767683]">{item.timestamp}</span>
                      <span className="text-xs text-[#767683]">•</span>
                      <span className="text-xs text-[#767683]">{item.department}</span>
                    </div>
                  </div>
                </div>

                <div className="px-1">
                  <h4 className="font-bold text-sm text-[#000666] mb-1">{item.title}</h4>
                  <p className="text-sm text-[#1b1b21] leading-relaxed">{item.description}</p>
                </div>

                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#eae7ef] border border-[#c6c5d4]/60">
                  <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.title} />
                </div>

                {isManager && item.status === 'pending' && (
                  <div className="pt-3 border-t border-[#c6c5d4]/40">
                    {reviewingId === item.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[#454652] font-medium mb-1 block">Điểm số</label>
                          <input type="number" value={reviewPoints} onChange={e => setReviewPoints(parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-[#c6c5d4] rounded-lg text-sm focus:outline-none focus:border-[#000666]" />
                        </div>
                        <div>
                          <label className="text-xs text-[#454652] font-medium mb-1 block">Nhận xét</label>
                          <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Nhập nhận xét..."
                            className="w-full px-3 py-2 border border-[#c6c5d4] rounded-lg text-sm focus:outline-none focus:border-[#000666] resize-none" rows={2} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => submitReview(item.id, 'good')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">thumb_up</span>Xác nhận
                          </button>
                          <button onClick={() => submitReview(item.id, 'bad')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">thumb_down</span>Cần xử lý
                          </button>
                          <button onClick={() => setReviewingId(null)} className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-[#c6c5d4] text-[#454652] hover:bg-[#f5f2fb] transition-colors">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setReviewingId(item.id); setReviewNote(''); setReviewPoints(10); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">thumb_up</span>Xác nhận
                        </button>
                        <button onClick={() => { setReviewingId(item.id); setReviewNote(''); setReviewPoints(-10); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">thumb_down</span>Cần xử lý
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isManager && item.status !== 'pending' && item.managerNote && (
                  <div className="pt-3 border-t border-[#c6c5d4]/40">
                    <div className="flex items-center gap-2 text-xs text-[#767683] mb-1">
                      <span>{item.reviewedBy}</span><span>•</span><span>{item.reviewedAt}</span>
                    </div>
                    <p className="text-sm text-[#1b1b21] bg-[#f9f8fc] p-2 rounded-lg">"{item.managerNote}"</p>
                    <div className="mt-2 text-sm font-semibold">
                      <span className={item.points > 0 ? 'text-green-600' : 'text-red-500'}>
                        {item.points > 0 ? '+' : ''}{item.points} điểm
                      </span>
                    </div>
                  </div>
                )}

                {!isManager && (
                  <div className="flex gap-3 pt-2 border-t border-[#c6c5d4]/40">
                    <button
                      onClick={() => onReactEvidence && onReactEvidence(item.id, 'good')}
                    className={"flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all " + (userReaction === 'good' ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-600')}
                  >
                    <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                    <span>Tốt</span>
                    {goodCount > 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{goodCount}</span>
                    )}
                  </button>

                  <button
                      onClick={() => onReactEvidence && onReactEvidence(item.id, 'bad')}
                    className={"flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all " + (userReaction === 'bad' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600')}
                  >
                    <span className="material-symbols-outlined text-[20px]">thumb_down</span>
                    <span>Cần xử lý</span>
                    {badCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badCount}</span>
                    )}
                  </button>
                </div>
                )}

                {!isManager && (goodCount > 0 || badCount > 0) && (
                  <div className="text-xs text-[#767683] text-center">
                    {goodCount > 0 && <span>{goodCount} người đánh giá tốt</span>}
                    {goodCount > 0 && badCount > 0 && <span> • </span>}
                    {badCount > 0 && <span>{badCount} người đánh giá chưa tốt</span>}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};
