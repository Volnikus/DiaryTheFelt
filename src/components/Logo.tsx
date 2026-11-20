import { useId } from "react";
import s from "./Logo.module.css";

export function Logo({ size = 30 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={s.logo} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`${id}-body`} x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="0.45" stopColor="#bffcf0" stopOpacity="0.12" />
          <stop offset="1" stopColor="#8e8cff" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="0.7" stopColor="#97fce4" stopOpacity="0.1" />
          <stop offset="1" stopColor="#c9c8ff" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={`${id}-mint`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 26) scale(22)">
          <stop offset="0" stopColor="#97fce4" />
          <stop offset="1" stopColor="#97fce4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-violet`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(42 40) scale(22)">
          <stop offset="0" stopColor="#8e8cff" />
          <stop offset="1" stopColor="#8e8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-core`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) scale(9)">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d9fff7" />
          <stop offset="1" stopColor="#97fce4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-spec`} x1="32" y1="6" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d="M32 3c17 0 29 3 29 29S49 61 32 61 3 49 3 32 15 3 32 3Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="64" height="64" fill="#06171a" />
        <g className={s.liquid}>
          <circle cx="24" cy="26" r="22" fill={`url(#${id}-mint)`} opacity="0.95" />
          <circle cx="42" cy="40" r="22" fill={`url(#${id}-violet)`} opacity="0.9" />
        </g>
        <path d="M32 3c17 0 29 3 29 29S49 61 32 61 3 49 3 32 15 3 32 3Z" fill={`url(#${id}-body)`} />
        <path className={s.sheen} d="M-20 64 L20 0 L34 0 L-6 64Z" fill="#ffffff" opacity="0.16" />
        <path d="M12 22C14 11 22 7 32 7s18 4 20 15c-6-5-12-7-20-7s-14 2-20 7Z" fill={`url(#${id}-spec)`} />
        <circle className={s.core} cx="32" cy="32" r="9" fill={`url(#${id}-core)`} />
      </g>
      <path d="M32 3.75c16.5 0 28.25 2.9 28.25 28.25S48.4 60.25 32 60.25 3.75 48.6 3.75 32 15.5 3.75 32 3.75Z" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.5" />
    </svg>
  );
}
