/** Nimbus, the diary's small cloud — drawn in one line of blue ink, like a margin doodle. */
export function NimbusMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 36" width={size} height={(size * 36) / 48} className={className} aria-hidden style={{ overflow: "visible", flex: "none" }}>
      <path
        d="M12 30 C 5 30, 3 22, 9 19 C 8 12, 16 8, 21 12 C 24 5, 36 6, 37 14 C 44 14, 46 24, 40 27 C 39 30, 36 30, 33 30 Z"
        fill="#FFFEFA" stroke="#2346B8" strokeWidth="2.2" strokeLinejoin="round" filter="url(#felt-rough)"
      />
      <circle cx="20" cy="20" r="1.6" fill="#2346B8" />
      <circle cx="29" cy="20" r="1.6" fill="#2346B8" />
      <path d="M22 24.5 Q 24.5 26.5 27 24.5" fill="none" stroke="#2346B8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
