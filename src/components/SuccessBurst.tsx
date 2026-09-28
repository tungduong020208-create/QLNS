import React, { useEffect, useMemo, useState } from 'react';

/**
 * SuccessBurst — the reusable celebration overlay from the Motion Lab.
 *
 * Used for outcomes that deserve a full-screen moment: successful
 * check-in/check-out, review milestones. Expanding rings + a drawn
 * check pop in; optional confetti rains down. Auto-dismisses after
 * ~1.9s (caller keeps its own success modal beneath it).
 */

interface SuccessBurstProps {
  /** Change this key (or mount/unmount) to (re)trigger the burst. */
  show: boolean;
  /** Rain confetti too (big wins like completed review cycles). */
  confetti?: boolean;
  /** Ring + check color. */
  color?: string;
  onDone?: () => void;
}

const CONFETTI_COLORS = ['#EFC14B', '#0F1E44', '#4CAF72', '#FF3131', '#5B8DEF', '#D9B98C'];

export const SuccessBurst: React.FC<SuccessBurstProps> = ({ show, confetti = false, color = '#4CAF72', onDone }) => {
  const [visible, setVisible] = useState(show);

  // Confetti pieces are generated once per mount (not per render) so the
  // rain looks natural. Hooks stay above any early return (rules of hooks).
  const pieces = useMemo(
    () =>
      Array.from({ length: confetti ? 42 : 0 }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dur: 1.8 + Math.random() * 1.4,
        delay: Math.random() * 0.5,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
      })),
    [confetti]
  );

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show || !visible) return null;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Confetti layer (optional) */}
      {confetti &&
        pieces.map((p, i) => (
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

      {/* Rings + drawn check */}
      <span className="relative w-28 h-28 flex items-center justify-center">
        <span className="anim-ring-expand absolute inset-0 rounded-full border-2" style={{ borderColor: color }} />
        <span className="anim-ring-expand absolute inset-0 rounded-full border" style={{ borderColor: color, opacity: 0.6, animationDelay: '120ms' }} />
        <svg viewBox="0 0 52 52" className="anim-success-pop relative w-28 h-28">
          <circle cx="26" cy="26" r="23" fill={color} />
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
    </div>
  );
};
