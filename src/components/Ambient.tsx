import s from "./Ambient.module.css";

export function Ambient() {
  return (
    <div className={s.ambient} aria-hidden>
      <div className={s.grid} />
      <span className={`${s.orb} ${s.a}`} />
      <span className={`${s.orb} ${s.b}`} />
      <span className={`${s.orb} ${s.c}`} />
      <div className={s.horizon} />
    </div>
  );
}
