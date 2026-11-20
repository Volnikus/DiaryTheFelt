"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import s from "./SiteHeader.module.css";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Archive" },
];

export function SiteHeader() {
  const path = usePathname();
  const onMemory = path.startsWith("/m/") && !path.endsWith("/edit");
  const links = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  const activeIndex = LINKS.findIndex((l) => (l.href === "/" ? path === "/" : path.startsWith(l.href)));

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
          <Logo size={30} />
          <b>Felt</b>
        </Link>
        <div className={s.links} ref={links}>
          {LINKS.map((l, i) => (
            <Link key={l.href} href={l.href} className={s.link} aria-current={i === activeIndex ? "page" : undefined}>
              <span>{l.label}</span>
            </Link>
          ))}
          <span className={s.active} style={indicator ? { transform: `translateX(${indicator.x}px)`, width: indicator.w, opacity: 1 } : { opacity: 0 }} aria-hidden />
        </div>
        <Link href="/new" className={`btn btn-primary btn-small ${s.cta}`}>
          <span className={s.plus} aria-hidden>+</span> New day
        </Link>
      </nav>
    </header>
  );
}
