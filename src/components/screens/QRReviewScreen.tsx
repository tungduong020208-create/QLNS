import React, { useState } from 'react';
import { User, QRReview } from '../../types';

interface QRReviewScreenProps {
  currentUser: User;
  reviews: QRReview[];
  onAddReview: (review: QRReview) => void;
}

const GOOGLE_REVIEW_URL = 'https://g.page/r/coffeehouse/review';

export const QRReviewScreen: React.FC<QRReviewScreenProps> = ({
  currentUser,
  reviews,
  onAddReview,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const myReviews = reviews.filter(r => r.employeeId === currentUser.id);
  const todayReviews = myReviews.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.dateString.startsWith(today);
  });
  const avgStars = myReviews.length > 0
    ? (myReviews.reduce((sum, r) => sum + r.stars, 0) / myReviews.length).toFixed(1)
    : '0.0';
  const fiveStarCount = myReviews.filter(r => r.stars === 5).length;

  const handleSubmit = () => {
    if (stars === 0) return;
    const now = new Date();
    const newReview: QRReview = {
      id: `qr-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeAvatar: currentUser.avatar,
      customerName: customerName || 'Khách hàng ẩn danh',
      stars,
      comment: comment || undefined,
      timestamp: `Hôm nay, ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      dateString: now.toISOString(),
      sentToGoogle: stars >= 4,
    };
    onAddReview(newReview);
    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setStars(0);
      setCustomerName('');
      setComment('');
    }, 3000);
  };

  const getStarLabel = (s: number) => {
    if (s >= 5) return { text: 'Rất tốt! ⭐⭐⭐⭐⭐', color: '#059669', bg: '#d1fae5', google: true };
    if (s >= 4) return { text: 'Tốt! ⭐⭐⭐⭐', color: '#059669', bg: '#d1fae5', google: true };
    if (s >= 3) return { text: 'Bình thường ⭐⭐⭐', color: '#d97706', bg: '#fef3c7', google: false };
    if (s >= 2) return { text: 'Chưa tốt ⭐⭐', color: '#ea580c', bg: '#fff7ed', google: false };
    return { text: 'Rất tệ ⭐', color: '#dc2626', bg: '#fee2e2', google: false };
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-headline text-xl md:text-2xl font-bold text-[#000666] mb-1">
          QR Đánh giá khách hàng
        </h1>
        <p className="text-sm text-[#767683]">
          Quét QR để khách hàng đánh giá • 5 sao → Google • 1-3 sao → Xử lý nội bộ
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Tổng đánh giá', value: myReviews.length, icon: 'star', color: '#000666' },
          { label: 'Điểm TB', value: avgStars, icon: 'trending_up', color: '#059669' },
          { label: '5 sao (Google)', value: fiveStarCount, icon: 'public', color: '#2563eb' },
          { label: 'Hôm nay', value: todayReviews.length, icon: 'today', color: '#7c3aed' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-[#c6c5d4]/40 text-center">
            <span className="material-symbols-outlined text-2xl mb-1 block" style={{ color: stat.color }}>
              {stat.icon}
            </span>
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[11px] text-[#767683] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Show QR Button */}
        <button
          onClick={() => { setShowQR(!showQR); setShowForm(false); }}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-[#c6c5d4]/40 hover:shadow-lg transition-all group"
        >
          <div className="w-14 h-14 rounded-xl bg-[#dee0ff] flex items-center justify-center group-hover:bg-[#000666] transition-colors">
            <span className="material-symbols-outlined text-3xl text-[#000666] group-hover:text-white transition-colors">
              qr_code_2
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-[#000666]">Hiển thị QR cho khách</h3>
            <p className="text-xs text-[#767683]">Khách quét QR để đánh giá trực tiếp</p>
          </div>
        </button>

        {/* Scan QR Button */}
        <button
          onClick={() => { setShowForm(!showForm); setShowQR(false); }}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-[#c6c5d4]/40 hover:shadow-lg transition-all group"
        >
          <div className="w-14 h-14 rounded-xl bg-[#d1fae5] flex items-center justify-center group-hover:bg-[#059669] transition-colors">
            <span className="material-symbols-outlined text-3xl text-[#059669] group-hover:text-white transition-colors">
              photo_camera
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-[#000666]">Nhập đánh giá thủ công</h3>
            <p className="text-xs text-[#767683]">Ghi nhận đánh giá từ khách hàng</p>
          </div>
        </button>
      </div>

      {/* QR Code Display */}
      {showQR && (
        <div className="bg-white rounded-2xl border border-[#c6c5d4]/40 p-6 mb-6 text-center">
          <h3 className="font-bold text-sm text-[#000666] mb-4">Quét QR để đánh giá</h3>
          <div className="inline-block bg-white p-4 rounded-xl border-2 border-[#000666] mb-4">
            <div className="w-56 h-56 bg-white rounded-lg flex items-center justify-center">
              <img src="/qr-code.png" alt="QR Code đánh giá" className="w-full h-full object-contain rounded-lg" />
            </div>
          </div>
          <p className="text-xs text-[#767683] mb-3">
            Khách hàng quét QR → Chọn số sao → Đánh giá
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-[#059669]">
              <span className="material-symbols-outlined text-sm">public</span>
              5 sao → Google Reviews
            </div>
            <div className="flex items-center gap-1.5 text-[#d97706]">
              <span className="material-symbols-outlined text-sm">business</span>
              1-3 sao → Xử lý nội bộ
            </div>
          </div>
        </div>
      )}

      {/* Manual Rating Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#c6c5d4]/40 p-6 mb-6">
          {submitted ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-6xl text-[#059669] mb-3 block">
                check_circle
              </span>
              <h3 className="font-bold text-lg text-[#000666] mb-1">Ghi nhận thành công!</h3>
              <p className="text-sm text-[#767683]">
                {stars >= 4
                  ? 'Đánh giá sẽ được gửi lên Google Reviews'
                  : 'Đánh giá đã được lưu để xử lý nội bộ'}
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-sm text-[#000666] mb-4">Nhập đánh giá từ khách hàng</h3>

              {/* Customer Name */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#454652] mb-1.5">Tên khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Chị Lan"
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f2fb] border border-[#c6c5d4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e6eff]"
                />
              </div>

              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#454652] mb-2">Đánh giá sao</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setStars(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <span
                        className={`material-symbols-outlined text-4xl ${
                          s <= (hoveredStar || stars)
                            ? 'text-[#f59e0b] fill'
                            : 'text-[#c6c5d4]'
                        }`}
                        style={{ fontVariationSettings: s <= (hoveredStar || stars) ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>

                {/* Star label */}
                {stars > 0 && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: getStarLabel(stars).bg, color: getStarLabel(stars).color }}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {getStarLabel(stars).google ? 'public' : 'business'}
                    </span>
                    {getStarLabel(stars).text}
                    {getStarLabel(stars).google && (
                      <span className="text-[10px] opacity-80">→ Google</span>
                    )}
                    {!getStarLabel(stars).google && (
                      <span className="text-[10px] opacity-80">→ Nội bộ</span>
                    )}
                  </div>
                )}
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#454652] mb-1.5">
                  Nhận xét <span className="text-[#767683] font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="VD: Cà phê ngon, nhân viên nhiệt tình..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#f5f2fb] border border-[#c6c5d4] text-sm focus:outline-none focus:ring-2 focus:ring-[#6e6eff] resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={stars === 0}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: stars >= 4 ? '#059669' : stars > 0 ? '#d97706' : '#c6c5d4',
                }}
              >
                {stars >= 4 ? 'Gửi lên Google Reviews' : stars > 0 ? 'Lưu đánh giá nội bộ' : 'Chọn số sao để gửi'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Review History */}
      <div className="mb-4">
        <h3 className="font-bold text-sm text-[#000666] mb-3">Đánh giá gần đây</h3>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#c6c5d4]/40">
            <span className="material-symbols-outlined text-5xl text-[#c6c5d4] mb-3 block">
              rate_review
            </span>
            <p className="text-[#767683] font-medium">Chưa có đánh giá nào</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl border border-[#c6c5d4]/40 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={review.employeeAvatar}
                    alt={review.employeeName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#dee0ff]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#000666]">
                        {review.employeeName}
                      </span>
                      <span className="text-[11px] text-[#767683]">phục vụ</span>
                    </div>
                    <p className="text-xs text-[#767683]">{review.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.sentToGoogle && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dbeafe] text-[#2563eb] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">public</span>
                      Google
                    </span>
                  )}
                  {!review.sentToGoogle && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">business</span>
                      Nội bộ
                    </span>
                  )}
                </div>
              </div>

              {/* Customer info */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#767683]">Khách hàng:</span>
                <span className="text-xs font-semibold text-[#000666]">{review.customerName}</span>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={`material-symbols-outlined text-lg ${
                      s <= review.stars ? 'text-[#f59e0b]' : 'text-[#e5e7eb]'
                    }`}
                    style={{ fontVariationSettings: s <= review.stars ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                ))}
                <span className="text-xs font-bold text-[#000666] ml-1">{review.stars}/5</span>
              </div>

              {/* Comment */}
              {review.comment && (
                <p className="text-xs text-[#454652] italic mt-1">"{review.comment}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
