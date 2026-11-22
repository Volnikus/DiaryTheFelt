import s from "./Logo.module.css";

/** Felt mark: a dark rounded square with a lowercase "f" and a small green dot (a day, kept). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className={s.logo} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="15" fill="#161616" />
      <path d="M36.5 14.5c-6.6 0-10.4 3.7-10.4 10.4V29h-5.6v7.2h5.6V51h8.4V36.2h7.3V29h-7.3v-3.4c0-2.6 1.2-3.8 3.6-3.8 1.3 0 2.6.2 3.8.6l1.3-7c-2-.6-4.3-.9-6.7-.9Z" fill="#fff" />
      <circle cx="47" cy="47" r="4.5" fill="#3FB58F" />
    </svg>
  );
}
