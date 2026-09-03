import React, { useState, useRef, useMemo } from 'react';
import { User, EvidenceItem, NotificationItem } from '../../types';
import { toDateStr, isWeekend } from '../../utils/schedule';

interface ReviewScreenProps {
  currentUser: User;
  evidences: EvidenceItem[];
  notifications: NotificationItem[];
  onReactEvidence?: (evidenceId: string, reactionType: 'good' | 'bad') => void;
  onMarkNotificationRead?: (id: string) => void;
  onSubmitEvidence?: (newEvidence: EvidenceItem) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  currentUser,
  evidences,
  notifications,
  onReactEvidence,
  onMarkNotificationRead,
  onSubmitEvidence,
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
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên công việc');
      return;
    }
    if (!selectedImage) {
      setErrorMessage('Vui lòng chụp hoặc tải lên hình ảnh minh chứng');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    setTimeout(() => {
      const now = new Date();
      const timeString = `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      const newEvidence: EvidenceItem = {
        id: `ev-${Date.now()}`,
        title: jobTitle.trim(),
        department: currentUser.department,
        timestamp: timeString,
        dateString: now.toISOString(),
        imageUrl: selectedImage,
        description: description.trim() || 'Không có mô tả',
        status: 'pending',
        points: 0,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeAvatar: currentUser.avatar
      };
      if (onSubmitEvidence) onSubmitEvidence(newEvidence);
      setIsSubmitting(false);
      setSuccessMessage('Gửi minh chứng thành công!');
      setTimeout(() => {
        setJobTitle('');
        setSelectedImage('');
        setDescription('');
        setSuccessMessage('');
        setShowSubmitForm(false);
      }, 1500);
    }, 600);
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

  // Check if selected date is a weekend
  const isWeekendSelected = useMemo(() => isWeekend(selectedDate), [selectedDate]);

  // Filter evidences by selected date AND schedule (only employees with shifts)
  const filteredEvidences = useMemo(() => {
    return evidences
      .filter((item) => {
        // Match date
        const itemDate = item.dateString.split('T')[0];
        return itemDate === selectedDate;
      })
      .filter((item) => {
        // Schedule-based filtering: only show employees with shifts on this date
        // Weekends: no employees have shifts, so hide all
        if (isWeekendSelected) return false;
        // Weekdays: all employees have shifts
        return true;
      })
      .filter((item) => {
        // Search filter
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
          item.employeeName.toLowerCase().includes(s) ||
          item.title.toLowerCase().includes(s) ||
          item.department.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        return new Date(b.dateString).getTime() - new Date(a.dateString).getTime();
      });
  }, [evidences, selectedDate, isWeekendSelected, searchTerm]);

  // Filter handover notifications by selected date
  const handoverNotifications = useMemo(() => {
    return notifications.filter((n) => n.category === 'handover');
  }, [notifications]);

  const getCounts = (item: EvidenceItem) => {
    const r = item.reactions || [];
    return { good: r.filter((x) => x.type === 'good').length, bad: r.filter((x) => x.type === 'bad').length };
  };

  const getUserReaction = (item: EvidenceItem): 'good' | 'bad' | null => {
    const r = (item.reactions || []).find((x) => x.userId === currentUser.id);
    return r?.type || null;
  };

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
              <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Nộp minh chứng công việc</h3>
              <p className="text-xs text-[#7A829A]">Vui lòng cung cấp hình ảnh rõ nét và thông tin chính xác.</p>
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
              <label className="block text-sm font-semibold text-[#0F1E44]">Tên công việc</label>
              <input
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VD: Vệ sinh khu vực sảnh chính"
                type="text"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">Hình ảnh minh chứng</label>
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
                <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#E8DFD0] rounded-xl bg-[#FDF8EE] hover:bg-[#F5EDDF] cursor-pointer group">
                  <div className="p-3 bg-[#1A2D5A] text-white rounded-full group-hover:scale-110 transition-transform shadow-md mb-2">
                    <span className="material-symbols-outlined text-3xl">photo_camera</span>
                  </div>
                  <p className="text-sm font-semibold text-[#0F1E44]">Chụp ảnh / Tải ảnh minh chứng</p>
                </div>
              )}
              <p className="text-xs text-[#7A829A]">Định dạng hỗ trợ: JPG, PNG. Kích thước tối đa: 5MB.</p>
              <input ref={fileInputRef} accept="image/png, image/jpeg" className="hidden" type="file" onChange={handleFileChange} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#0F1E44]">Mô tả công việc <span className="text-[#7A829A] font-normal">(không bắt buộc)</span></label>
              <textarea
                className="w-full rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm text-[#0F1E44] placeholder:text-[#7A829A] focus:border-[#0F1E44] focus:ring-1 focus:ring-[#0F1E44] focus:outline-none resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm chi tiết nếu cần thiết..."
                rows={3}
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
                <><span className="material-symbols-outlined text-[20px]">send</span><span>Gửi minh chứng</span></>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Handover Notifications Section */}
      {handoverNotifications.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[20px] text-[#0F1E44]">notifications</span>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44]">Thông báo bàn giao ca</h3>
            <span className="bg-[rgba(239,193,75,0.15)] text-[#0F1E44] text-xs font-semibold px-2 py-0.5 rounded-full">
              {handoverNotifications.filter((n) => !n.read).length} mới
            </span>
          </div>
          <div className="bg-white border border-[#E8DFD0]/70 rounded-2xl overflow-hidden shadow-sm">
            {handoverNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkNotificationRead && onMarkNotificationRead(item.id)}
                className={`p-4 border-b border-[#F5EDDF] last:border-b-0 hover:bg-[#FDF8EE] transition-colors cursor-pointer ${
                  !item.read ? 'bg-[#EFC14B]/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[rgba(239,193,75,0.15)] text-[#0F1E44]">
                    <span className="material-symbols-outlined text-[18px]">
                      {item.type === 'reward' ? 'military_tech' : item.type === 'penalty' ? 'warning' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-[#0F1E44]">{item.title}</span>
                      <span className="text-[11px] text-[#7A829A]">{item.time}</span>
                    </div>
                    <p className="text-xs text-[#7A829A] leading-relaxed">{item.message}</p>
                  </div>
                  {!item.read && <div className="w-2 h-2 rounded-full bg-[#EFC14B] self-center flex-shrink-0"></div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Date Filter Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#0F1E44]">Bàn giao ca</h2>
            <p className="text-xs text-[#7A829A] mt-0.5">Minh chứng theo ngày và lịch phân công</p>
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
        {isWeekendSelected ? (
          // Weekend: show message that no employees have shifts
          <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center text-sm shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3">event_busy</span>
            <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Ngày nghỉ</h3>
            <p className="text-xs text-[#7A829A]">
              {formattedSelectedDate} là ngày nghỉ. Không có ca làm việc và bàn giao ca.
            </p>
          </div>
        ) : filteredEvidences.length === 0 ? (
          <div className="bg-white border border-[#E8DFD0]/50 rounded-2xl p-10 text-center text-sm shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#E8DFD0] mb-3">feed</span>
            <h3 className="font-heading font-bold text-base text-[#0F1E44] mb-1">Chưa có minh chứng</h3>
            <p className="text-xs text-[#7A829A]">
              Chưa có minh chứng bàn giao ca nào cho ngày {formattedSelectedDate}.
            </p>
          </div>
        ) : (
          filteredEvidences.map((item) => {
            const { good: goodCount, bad: badCount } = getCounts(item);
            const userReaction = getUserReaction(item);
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
                      <span className="text-xs text-[#7A829A]">•</span>
                      <span className="text-xs text-[#7A829A]">{item.department}</span>
                    </div>
                  </div>
                </div>

                <div className="px-1">
                  <h4 className="font-bold text-sm text-[#0F1E44] mb-1">{item.title}</h4>
                  <p className="text-sm text-[#0F1E44] leading-relaxed">{item.description}</p>
                </div>

                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#F5EDDF] border border-[#E8DFD0]/60">
                  <img className="w-full h-full object-cover" src={item.imageUrl} alt={item.title} />
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#E8DFD0]/40">
                  <button
                    onClick={() => onReactEvidence && onReactEvidence(item.id, 'good')}
                    className={
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ' +
                      (userReaction === 'good'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-green-50 hover:text-green-600')
                    }
                  >
                    <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                    <span>Tốt</span>
                    {goodCount > 0 && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{goodCount}</span>}
                  </button>

                  <button
                    onClick={() => onReactEvidence && onReactEvidence(item.id, 'bad')}
                    className={
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ' +
                      (userReaction === 'bad'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600')
                    }
                  >
                    <span className="material-symbols-outlined text-[20px]">thumb_down</span>
                    <span>Cần xử lý</span>
                    {badCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badCount}</span>}
                  </button>
                </div>

                {(goodCount > 0 || badCount > 0) && (
                  <div className="text-xs text-[#7A829A] text-center">
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
