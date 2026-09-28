import React from 'react';

interface OwlProps {
  /** true when the login is in night mode — the owl's pupils glow golden. */
  nightMode: boolean;
  /**
   * true when the flashlight beam is shining on the owl. The owl hides in
   * the dark and only materialises while lit (opacity/scale transition).
   */
  lit: boolean;
}

/**
 * Owl — the AiiCafe HR mascot that hides on the login's account field.
 *
 * Pure inline SVG: an owl with big round eyes (blinking via CSS), tiny
 * ear tufts and talons gripping the "branch" (the field's top edge).
 * The owl is NOCTURNAL and SHY: it stays invisible until the flashlight
 * beam sweeps over its perch, then fades in. In night mode the pupils
 * glow amber, as if lit by the beam. Positioning/sizing is owned by the
 * wrapper span in LoginScreen (which also measures it for beam hits).
 */
export const Owl: React.FC<OwlProps> = ({ nightMode, lit }) => {
  const pupilFill = nightMode ? '#EFC14B' : '#0F1E44';

  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 48 48"
      className="animate-owl-bob drop-shadow-md transition-all duration-300"
      style={{
        opacity: lit ? 1 : 0,
        transform: lit ? 'scale(1)' : 'scale(0.85)',
      }}
      aria-hidden="true"
    >
      {/* ear tufts */}
      <path d="M10 12 L14 3 L19 10 Z" fill="#5B4232" />
      <path d="M38 12 L34 3 L29 10 Z" fill="#5B4232" />

      {/* body */}
      <ellipse cx="24" cy="26" rx="16" ry="17" fill="#6B4F3A" />
      {/* belly */}
      <ellipse cx="24" cy="31" rx="10.5" ry="10" fill="#D9B98C" />
      {/* belly feather chevrons */}
      <path d="M19 30 l3 3 3 -3 M23 30 l3 3 3 -3" stroke="#B08F5F" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M18 35 l3 3 3 -3 M24 35 l3 3 3 -3" stroke="#B08F5F" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* facial disc */}
      <ellipse cx="24" cy="18" rx="12.5" ry="10.5" fill="#7A5C45" />

      {/* eyes */}
      <circle cx="18.5" cy="17" r="6.4" fill="#FDF8EE" />
      <circle cx="29.5" cy="17" r="6.4" fill="#FDF8EE" />
      <circle cx="18.5" cy="17.4" r="3.1" fill={pupilFill}>
        {nightMode && <animate attributeName="r" values="3.1;2.4;3.1" dur="2.6s" repeatCount="indefinite" />}
      </circle>
      <circle cx="29.5" cy="17.4" r="3.1" fill={pupilFill}>
        {nightMode && <animate attributeName="r" values="3.1;2.4;3.1" dur="2.6s" repeatCount="indefinite" />}
      </circle>
      {/* eye highlights */}
      <circle cx="19.7" cy="16" r="1" fill="#FFFFFF" opacity="0.9" />
      <circle cx="30.7" cy="16" r="1" fill="#FFFFFF" opacity="0.9" />

      {/* eyelids (blink via CSS scaleY) */}
      <rect className="owl-eyelid" x="12.1" y="10.6" width="12.8" height="6.4" rx="3" fill="#6B4F3A" />
      <rect className="owl-eyelid" x="23.1" y="10.6" width="12.8" height="6.4" rx="3" fill="#6B4F3A" />

      {/* beak */}
      <path d="M24 20.5 L21.8 24.2 L26.2 24.2 Z" fill="#E8A33D" />

      {/* talons gripping the branch */}
      <path d="M18 42.5 l-2 3 M21 42.5 l0 3.4 M24 42.5 l0 3.4 M27 42.5 l0 3.4 M30 42.5 l2 3"
        stroke="#E8A33D" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
};
