import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, EvidenceItem, NotificationItem, PostReaction, PostComment, PostReactionType } from '../../types';
import { toDateStr, toLocalDateTimeStr } from '../../utils/schedule';
import { compressImage } from '../../utils/imageCompress';

interface ReviewScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  notifications: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  onSubmitEvidence?: (newEvidence: EvidenceItem) => void;
  onTogglePostReaction?: (postId: string, type: PostReactionType) => void;
  onAddPostComment?: (postId: string, content: string) => void;
  onDeletePostComment?: (commentId: string) => void;
  postReactions?: PostReaction[];
  postComments?: PostComment[];
}

/** Short display time for comments: "14:05" today, "11/9 14:05" otherwise */
const formatCommentTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })} ${time}`;
};

const REACTION_META: Record<PostReactionType, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'Thích' },
  love: { emoji: '❤️', label: 'Tim' },
  haha: { emoji: '😆', label: 'Haha' },
  sad: { emoji: '😢', label: 'Buồn' },
  angry: { emoji: '😡', label: 'Tức giận' },
  cry: { emoji: '😭', label: 'Khóc' },
};

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  currentUser,
  evidences,
  notifications,
  onMarkNotificationRead,
  onSubmitEvidence,
  onTogglePostReaction,
  onAddPostComment,
  onDeletePostComment,
  postReactions = [],
  postComments = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateStr(new Date()));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Comment section state: which post is expanded + per-post draft text
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const submitComment = (postId: string) => {
    const val = (commentDrafts[postId] || '').trim();
    if (!val) return;
    onAddPostComment?.(postId, val);
    setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
  };

  // Auto-mark handover notifications as read when this section is visible
  useEffect(() => {
    if (onMarkNotificationRead && notifications.length > 0) {
      const unreadHandover = notifications.filter(n => n.category === 'handover' && !n.read);
      unreadHandover.forEach(n => onMarkNotificationRead(n.id));
    }
  }, [notifications, onMarkNotificationRead]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Dung lượng tệp vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setSelectedImage(reader.result as string);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
    // Allow picking the same file again after clearing the preview
    e.target.value = '';
  };

  // Free posting: photo and text are both optional. A post needs at least
  // some content (text or image) so empty taps don't create blank posts.
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() && !description.trim() && !selectedImage) {
      setErrorMessage('Hãy nhập nội dung hoặc đính kèm một tấm ảnh trước khi đăng.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // Compress camera photos (full-resolution captures can be several MB)
      let imageToStore = selectedImage;
      if (imageToStore) {
        try {
          imageToStore = await compressImage(imageToStore);
        } catch {
          // keep original if compression fails
        }
      }
      const now = new Date();
      const timeString = `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      const newEvidence: EvidenceItem = {
        id: `ev-${Date.now()}`,
        title: jobTitle.trim() || (description.trim() ? description.trim().slice(0, 60) : 'Bài đăng bảng tin'),
        timestamp: timeString,
        dateString: toLocalDateTimeStr(now),
        imageUrl: imageToStore,
        description: description.trim(),
        status: 'pending',
        points: 0,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeAvatar: currentUser.avatar
      };
      if (onSubmitEvidence) onSubmitEvidence(newEvidence);
      setSuccessMessage('Đã đăng lên bảng tin!');
      setTimeout(() => {
        setJobTitle('');
        setSelectedImage('');
        setDescription('');
        setSuccessMessage('');
        setShowSubmitForm(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSubmitForm = () => {
    setJobTitle('');
    setSelectedImage('');
    setDescription('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowSubmitForm(false);
  };

  // Format selected date for display
  const formattedSelectedDate = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    if (selectedDate === todayStr) return 'Hôm nay';

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === toDateStr(yesterday)) return 'Hôm qua';

    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Filter evidences by selected date. The feed is a shared board: every post
  // shows for every user on that day, regardless of work schedule.
  const filteredEvidences = useMemo(() => {
    return evidences
      .filter((item) => {
        // Match date
        const itemDate = item.dateString.split('T')[0];
        return itemDate === selectedDate;
      })
      .filter((item) => {
        // Search filter
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
          item.employeeName.toLowerCase().includes(s) ||
          item.title.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        return new Date(b.dateString).getTime() - new Date(a.dateString).getTime();
      });
  }, [evidences, selectedDate, searchTerm]);

  // Get unique dates that have evidence (for quick navigation)
  const datesWithEvidence = useMemo(() => {
    const dates = new Set<string>();
    evidences.forEach((item) => {
      dates.add(item.dateString.split('T')[0]);
    });
    return Array.from(dates).sort().reverse();
  }, [evidences]);

  // Navigate to adjacent dates
  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    setSelectedDate(toDateStr(date));
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    setSelectedDate(toDateStr(date));
  };

  const goToToday = () => {
    setSelectedDate(toDateStr(new Date()));
  };

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto w-full antialiased">
      {/* Submit Evidence Form (shown when toggle is active) */}
      {showSubmitForm && (
        <section className="mb-6 bg-white rounded-2xl border border-[#E8DFD0]/60 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Đăng bài lên Bảng Tin</h3>
              <p className="text-xs text-[#7A829A]">Đăng tự do — chỉ cần nội dung hoặc ảnh, không bắt buộc theo mẫu.</p>
            </div>
            <button onClick={resetSubmitForm} className="text-[#7A829A] hover:text-[#0F1E44]">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmitEvidence} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[rgba(255,49,49,0.12)] text-[#FF3131] text-xs font-semibold rounded-xl flex items-center gap-2 border border-[#FF3131]/30">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-green-200">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {successMessage}
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">Tiêu đề <span className="text-[#7A829A] font-normal">(tùy chọn)</span></label>
              <input
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài đăng..."
                type="text"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">Hình ảnh <span className="text-[#7A829A] font-normal">(tùy chọn)</span></label>
              {selectedImage ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-[#0F1E44]/30 max-h-48 w-full group">
                  <img src={selectedImage} alt="Ảnh minh chứng" className="w-full h-full object-cover max-h-48" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-[#0F1E44] rounded-lg text-xs font-bold shadow hover:bg-[rgba(239,193,75,0.15)]">Chọn ảnh khác</button>
                    <button type="button" onClick={() => setSelectedImage('')} className="p-2 bg-[#FF3131] text-white rounded-lg shadow hover:bg-red-700">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#E8DFD0] rounded-xl bg-[#FDF8EE] group">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1.5 px-5 py-3 bg-[#1A2D5A] text-white rounded-xl hover:bg-[#0F1E44] transition-colors shadow-md">
                      <span className="material-symbols-outlined text-2xl">image</span>
                      <span className="text-xs font-semibold">Thư viện</span>
                    </button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-1.5 px-5 py-3 bg-[#EFC14B] text-[#0F1E44] rounded-xl hover:bg-[#F0CB69] transition-colors shadow-md">
                      <span className="material-symbols-outlined text-2xl">photo_camera</span>
                      <span className="text-xs font-bold">Chụp ảnh</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#7A829A] mt-3">Ảnh tùy chọn (JPG/PNG, tối đa 5MB)</p>
                </div>
              )}
              <p className="text-xs text-[#7A829A]">Định dạng hỗ trợ: JPG, PNG. Kích thước tối đa: 5MB.</p>
              <input ref={fileInputRef} accept="image/png, image/jpeg" className="hidden" type="file" onChange={handleFileChange} />
              <input ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" type="file" onChange={handleFileChange} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">Nội dung <span className="text-[#7A829A] font-normal">(tùy chọn)</span></label>
              <textarea
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bạn muốn chia sẻ điều gì lên bảng tin?"
                rows={4}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Đang gửi...</span></>
              ) : (
                <><span className="material-symbols-outlined text-[20px]">send</span><span>Đăng bài</span></>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Date Filter Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Bảng Tin</h2>
            <p className="text-xs text-[#7A829A] mt-0.5">Bài đăng theo ngày — đăng tự do, không cần theo mẫu</p>
          </div>
          {!showSubmitForm && onSubmitEvidence && (
            <button
              onClick={() => setShowSubmitForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Đăng bài mới</span>
            </button>
          )}
        </div>

        {/* Date Picker */}
        <div className="bg-white rounded-2xl border border-[#E8DFD0] p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#EFC14B] text-xl">calendar_today</span>
              <span className="text-sm font-bold text-[#0F1E44]">Chọn ngày xem</span>
            </div>
            {selectedDate !== toDateStr(new Date()) && (
              <button
                onClick={goToToday}
                className="text-xs font-semibold text-[#EFC14B] hover:underline"
              >
                Về hôm nay
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousDay}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FDF8EE] hover:bg-[#EFC14B]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[#0F1E44]">chevron_left</span>
            </button>

            <div className="flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-center text-sm font-bold text-[#0F1E44] bg-[#FDF8EE] border border-[#E8DFD0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#EFC14B] focus:ring-1 focus:ring-[#EFC14B]"
              />
            </div>

            <button
              onClick={goToNextDay}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FDF8EE] hover:bg-[#EFC14B]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[#0F1E44]">chevron_right</span>
            </button>
          </div>

          {/* Selected date display */}
          <div className="mt-3 text-center">
            <span className="text-sm font-heading font-bold text-[#0F1E44]">{formattedSelectedDate}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A829A] text-[20px]">search</span>
          <input
            className="w-full bg-white border border-[#E8DFD0] text-[#0F1E44] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] transition-colors placeholder:text-[#7A829A] shadow-sm"
            placeholder="Tìm kiếm nhân viên, ca làm..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A829A] hover:text-[#0F1E44]">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </section>

      {/* Evidence List */}
      <section className="flex flex-col gap-5">
        {filteredEvidences.length === 0 ? (
          <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center text-sm shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3">feed</span>
            <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có bài đăng</h3>
            <p className="text-xs text-[#7A829A]">
              Chưa có bài đăng nào cho ngày {formattedSelectedDate}.
            </p>
          </div>
        ) : (
          filteredEvidences.map((item) => {
            return (
              <article key={item.id} className="bg-white border border-[#E8DFD0]/70 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E8DFD0] flex-shrink-0">
                    <img className="w-full h-full object-cover" src={item.employeeAvatar} alt={item.employeeName} />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm md:text-base text-[#0F1E44] block">{item.employeeName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#7A829A]">{item.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="px-1">
                  {item.title && item.title !== item.description && (
                    <h4 className={`font-bold text-sm text-[#0F1E44] ${item.description ? 'mb-1' : ''}`}>{item.title}</h4>
                  )}
                  {item.description && (
                    <p className="text-sm text-[#0F1E44] leading-relaxed">{item.description}</p>
                  )}
                </div>

                {item.imageUrl && (
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#F5EDDF] border border-[#E8DFD0]/60">
                    <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.title || 'Ảnh bài đăng'} />
                  </div>
                )}

                {/* Reactions — 6 Facebook-style emojis, 1 per user per post:
                    tap to react, tap another to switch, tap the active one to remove */}
                {onTogglePostReaction && (
                  <div className="pt-2.5 border-t border-[#E8DFD0]/40">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(Object.keys(REACTION_META) as PostReactionType[]).map(type => {
                        const meta = REACTION_META[type];
                        const mine = postReactions.find(r => r.postId === item.id && r.userId === currentUser.id);
                        const isActive = mine?.type === type;
                        const count = postReactions.filter(r => r.postId === item.id && r.type === type).length;
                        return (
                          <button
                            key={type}
                            onClick={() => onTogglePostReaction(item.id, type)}
                            title={count > 0 ? `${meta.label} (${count})` : meta.label}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-[#EFC14B]/20 text-[#0F1E44] border border-[#EFC14B] scale-105'
                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-[#EFC14B]/10'
                            }`}
                          >
                            <span className="text-base leading-none">{meta.emoji}</span>
                            <span>{meta.label}</span>
                            {count > 0 && <span className="font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {onAddPostComment && (
                  <div className="pt-2.5 border-t border-[#E8DFD0]/40">
                    {(() => {
                      const postCommentsList = postComments
                        .filter(c => c.postId === item.id)
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                      const isOpen = commentsOpenFor === item.id;
                      return (
                        <>
                          <button
                            onClick={() => setCommentsOpenFor(isOpen ? null : item.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#7A829A] hover:text-[#0F1E44] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                            Bình luận ({postCommentsList.length})
                          </button>
                          {isOpen && (
                            <div className="mt-3 space-y-2.5">
                              {postCommentsList.map(comment => (
                                <div key={comment.id} className="flex items-start gap-2">
                                  {comment.userAvatar ? (
                                    <img src={comment.userAvatar} alt={comment.userName} className="w-7 h-7 rounded-full object-cover border border-[#E8DFD0] flex-shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#F5EDDF] flex items-center justify-center text-[10px] font-bold text-[#0F1E44] flex-shrink-0">
                                      {comment.userName.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 bg-[#F9F8FC] rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#0F1E44]">{comment.userName}</span>
                                      <span className="text-[10px] text-[#7A829A]">{formatCommentTime(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-[#0F1E44] leading-relaxed break-words">{comment.content}</p>
                                  </div>
                                  {comment.userId === currentUser.id && (
                                    <button
                                      onClick={() => onDeletePostComment?.(comment.id)}
                                      title="Xóa bình luận"
                                      className="p-1 text-[#7A829A] hover:text-[#FF3131] transition-colors flex-shrink-0"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  value={commentDrafts[item.id] || ''}
                                  onChange={(e) => setCommentDrafts({ ...commentDrafts, [item.id]: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') submitComment(item.id); }}
                                  placeholder="Viết bình luận..."
                                  className="flex-1 rounded-xl border border-[#E8DFD0] bg-white px-3.5 py-2 text-xs text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none"
                                />
                                <button
                                  onClick={() => submitComment(item.id)}
                                  disabled={!(commentDrafts[item.id] || '').trim()}
                                  className="px-3.5 py-2 rounded-xl bg-[#0F1E44] text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1A2D5A] transition-all"
                                >
                                  Gửi
</button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
