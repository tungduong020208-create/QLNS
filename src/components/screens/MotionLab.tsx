import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * MotionLab — DEV-ONLY effects playground (route /effects).
 *
 * A gallery where every motion-design effect designed for the app can be
 * triggered by hand. This route is statically removed from production
 * builds (`import.meta.env.DEV` is replaced with `false` by Vite), so it
 * never ships to real users.
 *
 * Sections map 1:1 to app functionality:
 *   1. Toasts          (mọi phản hồi hành động: lưu, gửi, duyệt…)
 *   2. Success         (check-in thành công, đổi mật khẩu…)
 *   3. Confetti        (hoàn thành đánh giá tuần, reaching goals)
 *   4. Modal           (mở/đóng hộp thoại với zoom + fade)
 *   5. Ripple          (nút bấm cảm ứng phản hồi tại điểm chạm)
 *   6. Skeleton        (đang tải lịch, dashboard…)
 *   7. Progress sheen  (tiến độ đánh giá, giờ làm tuần)
 *   8. Float-up list   (danh sách tin tức, thông báo vào trang)
 *   9. Check draw      (vẽ nét kiểm tra SVG trong nút)
 */

const CONFETTI_COLORS = ['#EFC14B', '#0F1E44', '#4CAF72', '#FF3131', '#5B8DEF', '#D9B98C'];

interface Toast {
  id: number;
  kind: 'success' | 'info' | 'error';
  msg: string;
  leaving?: boolean;
}

let toastSeq = 1;

export default function MotionLab() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [successKey, setSuccessKey] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; key: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(64);
  const [checkDrawKey, setCheckDrawKey] = useState(0);
  const rippleSeq = useRef(1);

  const pushToast = useCallback((kind: Toast['kind'], msg: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    // auto dismiss: start exit animation, then remove
    window.setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 260);
    }, 2600);
  }, []);

  const fireSuccess = () => setSuccessKey((k) => k + 1);

  const fireConfetti = () => setConfettiKey((k) => k + 1);

  const closeModal = () => {
    setModalClosing(true);
    window.setTimeout(() => {
      setShowModal(false);
      setModalClosing(false);
    }, 190);
  };

  const spawnRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const key = rippleSeq.current++;
    setRipples((r) => [...r, { id: key, x: e.clientX - rect.left, y: e.clientY - rect.top, key }]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== key)), 560);
  };

  const flashLoading = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 2600);
  };

  // Confetti pieces are generated per burst (keyed remount)
  const confettiPieces = Array.from({ length: 42 }, (_, i) => ({
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    dur: 1.8 + Math.random() * 1.4,
    delay: Math.random() * 0.5,
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
  }));

  useEffect(() => {
    document.title = 'Motion Lab — AiiCafe HR (dev)';
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF8EE] text-[#3D4663] p-6 sm:p-10 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EFC14B]">Dev-only · không có trong bản build</p>
        <h1 className="font-heading text-3xl font-bold text-[#0F1E44] mt-1">🎬 Motion Lab</h1>
        <p className="text-sm text-[#7A829A] mt-2">
          Bộ hiệu ứng chuyển động thiết kế cho AiiCafe HR. Bấm từng nút để xem hiệu ứng sẽ chạy khi
          dùng chức năng tương ứng trong app.
        </p>
      </header>

      {/* ── 1. Toasts ── */}
      <Section n={1} title="Toast thông báo" usage="Lưu hồ sơ · Gửi đơn · Duyệt bài · Lỗi">
        <div className="flex flex-wrap gap-2">
          <DemoBtn onClick={() => pushToast('success', '✓ Đã lưu thay đổi hồ sơ')}>Success toast</DemoBtn>
          <DemoBtn onClick={() => pushToast('info', 'Đã gửi yêu cầu tới quản lý')}>Info toast</DemoBtn>
          <DemoBtn onClick={() => pushToast('error', 'Mất kết nối — thử lại nhé')}>Error toast</DemoBtn>
        </div>
      </Section>

      {/* ── 2. Success burst ── */}
      <Section n={2} title="Thành công bùng nổ" usage="Check-in · Check-out · Đổi mật khẩu">
        <div className="flex items-center gap-4">
          <DemoBtn onClick={fireSuccess}>Chạy hiệu ứng</DemoBtn>
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* static rings */}
            <span className="absolute inset-0 rounded-full bg-[#4CAF72]/15" />
            {successKey > 0 && (
              <span key={successKey} className="absolute inset-0">
                <span className="anim-ring-expand absolute inset-0 rounded-full border-2 border-[#4CAF72]" />
                <span className="anim-ring-expand absolute inset-0 rounded-full border border-[#4CAF72]/60" style={{ animationDelay: '120ms' }} />
                <svg viewBox="0 0 52 52" className="anim-success-pop relative w-16 h-16">
                  <circle cx="26" cy="26" r="23" fill="#4CAF72" />
                  <path
                    className="anim-check-draw"
                    d="M15 27 L23 35 L38 19"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs text-[#7A829A]">Vòng tròn lan ra + dấu check được vẽ nét.</p>
        </div>
      </Section>

      {/* ── 3. Confetti ── */}
      <Section n={3} title="Confetti ăn mừng" usage="Hoàn thành 5 đánh giá tuần · Thưởng">
        <DemoBtn onClick={fireConfetti}>Ném confetti 🎉</DemoBtn>
      </Section>

      {/* ── 4. Modal ── */}
      <Section n={4} title="Modal vào/ra" usage="Mọi hộp thoại: xác nhận, chi tiết, biểu mẫu">
        <DemoBtn onClick={() => setShowModal(true)}>Mở modal</DemoBtn>
      </Section>

      {/* ── 5. Ripple ── */}
      <Section n={5} title="Ripple nút bấm" usage="Phản hồi điểm chạm trên mọi nút chính">
        <button
          onClick={spawnRipple}
          className="relative overflow-hidden px-6 h-12 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm cursor-pointer"
          style={{ color: '#EFC14B' }}
        >
          {ripples.map((r) => (
            <span key={r.key} className="ripple-ink" style={{ left: r.x, top: r.y }} />
          ))}
          Bấm vào tôi
        </button>
      </Section>

      {/* ── 6. Skeleton ── */}
      <Section n={6} title="Skeleton loading" usage="Đang tải lịch · Dashboard · Danh sách">
        <DemoBtn onClick={flashLoading}>Chạy 2.6s</DemoBtn>
        <div className="mt-4 space-y-2.5" style={{ opacity: loading ? 1 : 0.25 }}>
          <div className={`h-5 ${loading ? 'skeleton' : 'bg-[#E8DFD0]/60 rounded-lg'}`} style={{ width: '62%' }} />
          <div className={`h-5 ${loading ? 'skeleton' : 'bg-[#E8DFD0]/60 rounded-lg'}`} style={{ width: '84%' }} />
          <div className={`h-5 ${loading ? 'skeleton' : 'bg-[#E8DFD0]/60 rounded-lg'}`} style={{ width: '45%' }} />
          <div className="flex gap-3 items-center">
            <div className={`w-10 h-10 rounded-full ${loading ? 'skeleton' : 'bg-[#E8DFD0]/60'}`} />
            <div className={`h-5 flex-1 ${loading ? 'skeleton' : 'bg-[#E8DFD0]/60 rounded-lg'}`} />
          </div>
        </div>
      </Section>

      {/* ── 7. Progress sheen ── */}
      <Section n={7} title="Thanh tiến độ óng ánh" usage="Tiến độ đánh giá · Giờ làm tuần">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-[#EFC14B] mb-3 cursor-pointer"
        />
        <div className="relative h-3.5 rounded-full bg-[#E8DFD0] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#EFC14B] to-[#D4A833] transition-all duration-300 relative" style={{ width: `${progress}%` }}>
            <span className="progress-sheen" />
          </div>
        </div>
        <p className="text-xs text-[#7A829A] mt-2">{progress}% — dải sáng chảy liên tục trên phần hoàn thành.</p>
      </Section>

      {/* ── 8. Float-up list ── */}
      <Section n={8} title="Danh sách trôi vào" usage="Tin tức · Thông báo · Ca làm xuất hiện">
        <FloatUpList />
      </Section>

      {/* ── 9. Check draw button ── */}
      <Section n={9} title="Nút vẽ dấu check" usage="Xác nhận ca · Duyệt · Tick nhanh">
        <DrawCheckButton onDone={() => pushToast('success', '✓ Đã xác nhận')} refreshKey={checkDrawKey} onRestart={() => setCheckDrawKey((k) => k + 1)} />
      </Section>

      {/* ── Toast portal ── */}
      <div className="fixed top-5 right-5 z-[80] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl shadow-lg px-4 py-3 text-sm font-semibold border anim-toast-in ${t.leaving ? 'anim-toast-out' : ''} ${
              t.kind === 'success'
                ? 'bg-white border-[#4CAF72]/40 text-[#2E7D52]'
                : t.kind === 'error'
                  ? 'bg-white border-[#FF3131]/40 text-[#FF3131]'
                  : 'bg-white border-[#0F1E44]/20 text-[#0F1E44]'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${t.kind === 'success' ? 'text-[#4CAF72]' : t.kind === 'error' ? 'text-[#FF3131]' : 'text-[#5B8DEF]'}`}>
              {t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'}
            </span>
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Modal demo ── */}
      {showModal && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 anim-backdrop-in p-4`}>
          <div className={`bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl ${modalClosing ? 'anim-modal-out' : 'anim-modal-in'}`}>
            <div className="w-12 h-12 rounded-xl bg-[#EFC14B]/20 text-[#0F1E44] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-1">Modal mượt mà</h3>
            <p className="text-sm text-[#7A829A] mb-5">
              Backdrop fade 200ms · thẻ zoom-in 300ms bounce nhẹ · đóng thì thu lại 180ms.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-semibold rounded-lg text-[#7A829A] hover:bg-[#FDF8EE] cursor-pointer">
                Đóng lại
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold rounded-lg bg-[#0F1E44] text-white hover:bg-[#1A2D5A] cursor-pointer">
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confetti layer ── */}
      {confettiKey > 0 && (
        <div key={confettiKey} className="fixed inset-0 z-[75] pointer-events-none overflow-hidden">
          {confettiPieces.map((p, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                ['--dur' as string]: `${p.dur}s`,
                ['--delay' as string]: `${p.delay}s`,
                ['--spin' as string]: `${p.spin}deg`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────── */

const Section: React.FC<{ n: number; title: string; usage: string; children: React.ReactNode }> = ({ n, title, usage, children }) => (
  <section className="mb-8 bg-white rounded-2xl border border-[#E8DFD0]/70 p-5 shadow-navy">
    <div className="flex items-baseline gap-2 mb-1">
      <span className="text-[11px] font-bold text-[#EFC14B]">{String(n).padStart(2, '0')}</span>
      <h2 className="font-heading text-lg font-bold text-[#0F1E44]">{title}</h2>
    </div>
    <p className="text-xs text-[#7A829A] mb-4">{usage}</p>
    {children}
  </section>
);

const DemoBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="px-4 h-10 rounded-xl bg-[#0F1E44] text-white text-sm font-semibold hover:bg-[#1A2D5A] active:scale-[0.97] transition-all cursor-pointer"
  >
    {children}
  </button>
);

/** Demo 8: list items staggered float-up, re-runs on refresh click. */
const FloatUpList: React.FC = () => {
  const [items, setItems] = useState<string[]>([]);
  const seq = useRef(1);
  const add = () => {
    const msgs = ['📩 Đơn xin nghỉ của Thị Mai', '📢 Lịch tuần 40 đã đăng', '⭐ Thị Bích được khen bởi khách', '🧾 Bảng giờ tuần 39 chốt'];
    setItems((prev) => [...prev.slice(-3), msgs[seq.current++ % msgs.length]]);
  };
  return (
    <div>
      <DemoBtn onClick={add}>Thêm mục</DemoBtn>
      <div className="mt-4 space-y-2">
        {items.map((m, i) => (
          <div key={`${m}-${i}`} className="anim-float-up bg-[#FDF8EE] border border-[#E8DFD0] rounded-xl px-4 py-2.5 text-sm font-medium text-[#0F1E44]">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Demo 9: button whose icon draws a check, then fires a callback. */
const DrawCheckButton: React.FC<{ onDone: () => void; refreshKey: number; onRestart: () => void }> = ({ onDone, refreshKey, onRestart }) => {
  const [state, setState] = useState<'idle' | 'drawing' | 'done'>('idle');
  const start = () => {
    if (state === 'drawing') return;
    setState('drawing');
    window.setTimeout(() => {
      setState('done');
      onDone();
    }, 640);
  };
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={start}
        className="flex items-center gap-2 px-5 h-11 rounded-xl bg-[#4CAF72] text-white font-semibold text-sm hover:bg-[#3E9661] active:scale-[0.97] transition-all cursor-pointer disabled:opacity-80"
        disabled={state === 'drawing'}
      >
        <svg viewBox="0 0 52 52" className="w-5 h-5">
          <circle cx="26" cy="26" r="22" fill="none" stroke="white" strokeWidth="4" className={state !== 'idle' ? 'anim-circle-draw' : ''} opacity={state !== 'idle' ? 1 : 0.4} />
          <path
            d="M16 27 L23.5 34.5 L37 19"
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={state !== 'idle' ? 'anim-check-draw' : ''}
            opacity={state !== 'idle' ? 1 : 0.4}
          />
        </svg>
        {state === 'done' ? 'Đã xác nhận ✓' : state === 'drawing' ? 'Đang ghi nhận…' : 'Xác nhận'}
      </button>
      {state === 'done' && (
        <button onClick={onRestart} className="text-xs font-semibold text-[#5B8DEF] hover:underline cursor-pointer">
          Chạy lại
        </button>
      )}
    </div>
  );
};
