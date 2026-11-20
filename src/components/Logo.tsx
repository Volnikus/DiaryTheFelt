import s from "./Logo.module.css";

/** Felt mark: a yellow square (the system's single accent) holding Nimbus, the diary cloud. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className={s.logo} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="5" fill="#FFD83D" />
      <g className={s.face}>
        <path d="M18 46c-6 0-8.5-5-6.4-8.6C9.5 32.5 14.6 28 19.6 30c1.4-6.2 10.4-7.8 13.4-2 4.6-3 11-.4 10 5.2 5.2 1.6 4.4 12.8-1.6 12.8Z" fill="#fff" stroke="#11110F" strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="24" y="35" width="3" height="5" rx="1" fill="#11110F" />
        <rect x="34.5" y="35" width="3" height="5" rx="1" fill="#11110F" />
        <path d="M28.5 42.3q2.3 2 4.6 0" fill="none" stroke="#11110F" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
