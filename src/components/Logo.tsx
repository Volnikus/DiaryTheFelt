import s from "./Logo.module.css";

/** Felt mark: a page from the notebook with a pen "f", in one ink. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className={s.logo} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M12 8 C 25 6, 41 7, 53 9 C 55 24, 55 42, 53 56 C 39 58, 25 58, 11 56 C 9 40, 9 24, 12 8 Z" fill="none" stroke="#2346B8" strokeWidth="3.2" strokeLinejoin="round" filter="url(#felt-rough)" />
      <path d="M40 18 C 33 15, 28 20, 29 28 L 30 47 M 23 30 C 29 29, 34 29, 39 30" fill="none" stroke="#2346B8" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
