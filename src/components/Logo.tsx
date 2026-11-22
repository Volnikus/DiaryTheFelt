import s from "./Logo.module.css";

/**
 * Felt's mark: Mote, the mood blot — a dab of yellow highlighter with a face drawn
 * in blue ballpoint. Paired with "felt" set in soft italic.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg className={s.logo} width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M20.5 5.2 C29.8 5 35.6 12 35.4 21 C35.2 30 28.8 35.6 20 35.5 C11 35.4 4.9 29.4 5.1 20.6 C5.3 11.8 11.4 5.4 20.5 5.2 Z" fill="#FFD84D" />
      <path d="M11 15.5 C12.6 11.6 16 9.4 19.6 9.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.65" />
      <path
        d="M20 4.6 C30 4 36.6 11.5 36.2 21 C35.8 31 28.6 36.6 19.7 36.3 C10.6 36 4 29.5 4.3 20.3 C4.6 11.6 10.6 5.3 21 5.6"
        fill="none" stroke="#2346B8" strokeWidth="2.4" strokeLinecap="round" filter="url(#felt-rough)"
      />
      <g className={s.eyes}>
        <ellipse cx="15" cy="19.5" rx="1.5" ry="2.2" fill="#1B1F3B" />
        <ellipse cx="25" cy="19.5" rx="1.5" ry="2.2" fill="#1B1F3B" />
      </g>
      <path d="M15.2 25.2 C17.5 28.2 22.5 28.2 24.8 25.2" fill="none" stroke="#1B1F3B" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="11.5" cy="24" r="2.2" fill="#FF8FA8" opacity="0.7" />
      <circle cx="28.5" cy="24" r="2.2" fill="#FF8FA8" opacity="0.7" />
    </svg>
  );
}
