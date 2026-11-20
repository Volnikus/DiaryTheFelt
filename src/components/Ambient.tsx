import s from "./Ambient.module.css";

// A few small clouds drifting slowly behind the page — the same cloud as Nimbus,
// kept faint so text always stays on a calm, dark ground.
const CLOUDS = [
  { top: "12%", size: 120, dur: 140, delay: -20, op: 0.07 },
  { top: "28%", size: 70, dur: 110, delay: -80, op: 0.05 },
  { top: "47%", size: 160, dur: 190, delay: -130, op: 0.06 },
  { top: "66%", size: 90, dur: 125, delay: -40, op: 0.05 },
  { top: "84%", size: 130, dur: 170, delay: -100, op: 0.07 },
];

export function Ambient() {
  return (
    <div className={s.ambient} aria-hidden>
      {CLOUDS.map((c, i) => (
        <svg
          key={i}
          className={s.cloud}
          viewBox="0 0 120 50"
          style={{ top: c.top, width: c.size, opacity: c.op, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        >
          <path d="M8 46h104c6 0 6-8 0-8-1-9-12-12-18-7-3-12-20-14-26-3-8-6-20-2-20 8-5-3-14 0-14 6H8c-5 0-5 4 0 4Z" fill="#DCDDF3" />
        </svg>
      ))}
    </div>
  );
}
