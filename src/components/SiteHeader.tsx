"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { setSound, useSound } from "@/lib/client/sound";
import { Logo } from "./Logo";
import s from "./SiteHeader.module.css";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/year", label: "Year" },
  { href: "/recap", label: "Recaps" },
];

export function SiteHeader() {
  const path = usePathname();
  const onMemory = path.startsWith("/m/") && !path.endsWith("/edit");
  const links = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const activeIndex = LINKS.findIndex((l) => (l.href === "/" ? path === "/" : path.startsWith(l.href)));

  const sound = useSound();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = links.current?.children[activeIndex] as HTMLElement | undefined;
    setIndicator(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, [activeIndex]);

  return (
    <header className={`${s.header} ${onMemory ? s.overlay : ""} ${scrolled || onMemory ? s.solid : ""}`}>
      <nav className={s.pill} aria-label="Main">
        <Link href="/" className={s.brand} aria-label="Felt — home">
          <Logo size={32} />
          <b>felt</b>
        </Link>
        <div className={s.links} ref={links}>
          {LINKS.map((l, i) => (
            <Link key={l.href} href={l.href} className={s.link} aria-current={i === activeIndex ? "page" : undefined}>
              <span>{l.label}</span>
            </Link>
          ))}
          <svg className={s.active} viewBox="0 0 100 10" preserveAspectRatio="none" style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, opacity: 1 } : { opacity: 0 }} aria-hidden>
            <path d="M4 6 C 25 2, 50 9, 72 5 S 92 4, 97 6" />
          </svg>
        </div>
        <button
          type="button"
          className={s.sound}
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          aria-label={sound ? "Turn paper sounds off" : "Turn paper sounds on"}
          title={sound ? "Paper sounds on" : "Paper sounds off"}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 9.5 L8 9.5 L13 5 L13 19 L8 14.5 L4 14.5 Z" />
            {sound ? (
              <>
                <path d="M16 9 C17.5 10.5 17.5 13.5 16 15" />
                <path d="M18.5 6.5 C21.5 9.5 21.5 14.5 18.5 17.5" />
              </>
            ) : (
              <path d="M16.5 9.5 L21 14.5 M21 9.5 L16.5 14.5" />
            )}
          </svg>
        </button>
        <Link href="/new" className={`btn btn-primary btn-small ${s.cta}`} aria-label="New day">
          <span className={s.plus} aria-hidden>+</span><span className={s.ctaText}> new day</span>
        </Link>
      </nav>
    </header>
  );
}
