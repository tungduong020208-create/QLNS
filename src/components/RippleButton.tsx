import React, { useRef, useState } from 'react';

/**
 * RippleButton — a button that spawns a Material-style ink ripple from the
 * click point (Motion Lab demo 05). Drop-in for primary CTAs:
 *
 *   <RippleButton onClick={...} className="...">Text</RippleButton>
 *
 * The ripple color follows the button's `color` CSS property (currentColor),
 * so set text color via className as usual.
 */

interface Ripple {
  key: number;
  x: number;
  y: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const RippleButton: React.FC<RippleButtonProps> = ({ children, onClick, className = '', ...rest }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seq = useRef(1);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const key = seq.current++;
    setRipples((r) => [...r, { key, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.key !== key)), 560);
    onClick?.(e);
  };

  return (
    <button {...rest} onClick={handleClick} className={`relative overflow-hidden ${className}`}>
      {ripples.map((r) => (
        <span key={r.key} className="ripple-ink" style={{ left: r.x, top: r.y }} />
      ))}
      {children}
    </button>
  );
};
