"use client";

import { motion } from "motion/react";
import { useId } from "react";

// Lobes of the cloud. They share one gradient in user space, so the union
// reads as a single soft volume instead of stacked circles.
const LOBES: [number, number, number][] = [
  [38, 60, 24], [62, 42, 30], [90, 48, 25], [110, 64, 17], [22, 70, 15],
];

/** Nimbus, the diary cloud — lit from the top-left, shaded lavender underneath. */
export function NimbusCloud({ width = 96, blink = true, shadow = true }: { width?: number; blink?: boolean; shadow?: boolean }) {
  const id = useId().replace(/:/g, "");
  const face = "#2A2C47";
  const shape = (
    <>
      {LOBES.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
      <rect x="16" y="58" width="104" height="28" rx="14" />
    </>
  );

  return (
    <svg viewBox="0 0 136 96" width={width} height={(width * 96) / 136} style={{ overflow: "visible", display: "block" }} aria-hidden>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="10" x2="0" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#F6F6FF" />
          <stop offset="1" stopColor="#D3D6F4" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>{shape}</clipPath>
        <filter id={`${id}-drop`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0A0B1A" floodOpacity="0.38" />
        </filter>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <g filter={shadow ? `url(#${id}-drop)` : undefined} fill={`url(#${id}-fill)`}>{shape}</g>

      <g clipPath={`url(#${id}-clip)`}>
        {/* lavender core shade along the underside */}
        <ellipse cx="70" cy="90" rx="58" ry="10" fill="#B9BDE8" opacity="0.55" filter={`url(#${id}-blur)`} />
        {/* soft top highlights on the biggest lobes */}
        <ellipse cx="56" cy="22" rx="20" ry="9" fill={`url(#${id}-shine)`} />
        <ellipse cx="86" cy="30" rx="13" ry="6" fill={`url(#${id}-shine)`} opacity="0.8" />
      </g>

      {/* cheeks */}
      <ellipse cx="49" cy="71" rx="6" ry="3.4" fill="#FFB6C9" opacity="0.75" filter={`url(#${id}-blur)`} />
      <ellipse cx="89" cy="71" rx="6" ry="3.4" fill="#FFB6C9" opacity="0.75" filter={`url(#${id}-blur)`} />

      {/* eyes */}
      <motion.g
        animate={blink ? { scaleY: [1, 1, 0.1, 1] } : undefined}
        transition={blink ? { duration: 5.2, repeat: Infinity, times: [0, 0.92, 0.95, 1] } : undefined}
        style={{ originX: 0.5, originY: 0.5, transformBox: "fill-box" }}
      >
        <ellipse cx="58" cy="62" rx="3.6" ry="5" fill={face} />
        <ellipse cx="80" cy="62" rx="3.6" ry="5" fill={face} />
        <circle cx="59.3" cy="60.2" r="1.25" fill="#fff" />
        <circle cx="81.3" cy="60.2" r="1.25" fill="#fff" />
      </motion.g>
      {/* smile */}
      <path d="M64 71.5 Q69 75.5 74 71.5" fill="none" stroke={face} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
