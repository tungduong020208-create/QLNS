import React, { useEffect, useRef, useState } from 'react';

/**
 * LogoutDoorButton — the "Đăng xuất" pill with a tiny door scene.
 *
 * Idle: the blue stick figure stands beside a closed door.
 * Click → the door swings open, the figure WALKS IN (legs swinging),
 * the door closes behind it… and then the figure tumbles OUT of the
 * bottom of the frame (rớt xuống) with a poof of golden stars, and the
 * session ends. Clicking again during the walk cancels (a soft undo);
 * once the door has shut, logout is committed and only the animation plays.
 *
 * Pure CSS/SVG keyframes — no dependencies.
 */

type Phase = 'idle' | 'walking' | 'falling';

interface LogoutDoorButtonProps {
  onLogout: () => void;
  className?: string;
}

/** Total walk animation (must match CSS --walk-ms below). */
const WALK_MS = 1100;
/** Falling starts when the door shuts; matches CSS --fall-ms. */
const FALL_MS = 950;

export const LogoutDoorButton: React.FC<LogoutDoorButtonProps> = ({ onLogout, className = '' }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<number[]>([]);
  const logoutFired = useRef(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleClick = () => {
    if (phase === 'walking') {
      // Cancel: let the figure step back out before the door shuts.
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPhase('idle');
      return;
    }
    if (phase !== 'idle') return;

    setPhase('walking');
    // Door shuts → figure drops with the falling door…
    later(() => setPhase('falling'), WALK_MS);
    // …and by the time the tumble ends, the session is over.
    later(() => {
      if (!logoutFired.current) {
        logoutFired.current = true;
        onLogout();
      }
    }, WALK_MS + FALL_MS - 250);
  };

  const busy = phase !== 'idle';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={busy ? 'Đang ra về… (bấm lần nữa để ở lại)' : 'Đăng xuất'}
      aria-label="Đăng xuất"
      className={`logout-door-btn group relative flex items-center gap-2 h-9 pl-3.5 pr-3 rounded-full bg-[#0F1E44] text-white text-[13px] font-semibold shadow-navy hover:bg-[#1A2D5A] active:scale-[0.97] transition-all cursor-pointer select-none ${className}`}
    >
      <span className="leading-none">Đăng xuất</span>

      {/* ── The door scene ─────────────────────────────────────────────── */}
      <span className="door-scene relative block w-[34px] h-[30px] overflow-hidden rounded-md" aria-hidden="true">
        {/* Doorframe */}
        <span className="door-frame absolute inset-y-[3px] right-[5px] w-[16px] rounded-[3px] bg-[#E8DFD0]/25 border border-[#E8DFD0]/40" />
        {/* The leaf (hinged on the RIGHT so it opens inward-right like the reference) */}
        <span className={`door-leaf absolute inset-y-[3px] right-[5px] w-[16px] origin-right rounded-[3px] bg-gradient-to-br from-[#5B8DEF] to-[#3D6BD8] ${phase !== 'idle' ? 'door-leaf-open' : ''}`}>
          <span className="absolute top-1/2 left-[2px] -translate-y-1/2 w-[2px] h-[2px] rounded-full bg-[#EFC14B]" />
        </span>

        {/* Stick figure — walks in, then tumbles out of the BOTTOM */}
        <span className={`stick-figure absolute left-[2px] bottom-[1px] block ${phase === 'walking' ? 'figure-walk-in' : ''} ${phase === 'falling' ? 'figure-fall' : ''}`}>
          <svg width="14" height="24" viewBox="0 0 14 24">
            <g stroke="#5B8DEF" strokeWidth="2" strokeLinecap="round" fill="none">
              {/* head */}
              <circle cx="7" cy="4" r="3" fill="#5B8DEF" stroke="none" />
              {/* body */}
              <line x1="7" y1="7.5" x2="7" y2="14" />
              {/* arms */}
              <line className="arm-f" x1="7" y1="9" x2="11" y2="12" />
              <line className="arm-b" x1="7" y1="9" x2="3" y2="12" />
              {/* legs */}
              <line className="leg-f" x1="7" y1="14" x2="10.5" y2="19" />
              <line className="leg-b" x1="7" y1="14" x2="3.5" y2="19" />
            </g>
          </svg>
        </span>

        {/* Golden star poof when the figure drops */}
        {phase === 'falling' && (
          <>
            {['-6px, -8px', '6px, -10px', '0px, -12px', '-9px, -3px', '9px, -4px'].map((t, i) => (
              <span
                key={i}
                className="star-poof material-symbols-outlined absolute left-1/2 top-1/2 text-[8px] text-[#EFC14B]"
                style={{ animationDelay: `${i * 70}ms`, ['--tx' as string]: t.split(',')[0], ['--ty' as string]: t.split(',')[1] }}
              >
                star
              </span>
            ))}
          </>
        )}
      </span>
    </button>
  );
};
