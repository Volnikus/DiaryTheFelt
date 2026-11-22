"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { sfx } from "@/lib/client/sound";

// How deep into the notebook each page sits: going deeper turns the page forward, going back turns it back.
const depth = (p: string) => (p === "/" ? 0 : p.startsWith("/archive") ? 1 : p.startsWith("/new") ? 1 : p.startsWith("/year") ? 2 : p.startsWith("/m/") ? 3 : 1);

/**
 * Moving between pages turns the leaf of the notebook: the old page lifts off the spine
 * on the left and turns over, revealing the next one. Uses the View Transitions API with
 * the app router; browsers without it (or with reduced motion) just navigate.
 */
export function PageTurn() {
  const router = useRouter();
  const path = usePathname();
  const done = useRef<(() => void) | null>(null);

  // the new page has rendered: let the turn finish
  useEffect(() => {
    const finish = done.current;
    done.current = null;
    if (finish) requestAnimationFrame(() => finish());
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || url.pathname.startsWith("/api")) return;
      const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };
      if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      e.preventDefault();
      const root = document.documentElement;
      root.dataset.turn = depth(url.pathname) < depth(location.pathname) ? "back" : "forward";
      sfx.rustle();
      const turn = doc.startViewTransition(() => new Promise<void>((resolve) => {
        done.current = resolve;
        router.push(url.pathname + url.search + url.hash);
        setTimeout(resolve, 2500); // a slow page should not hold the turn forever
      }));
      turn.finished.finally(() => { delete root.dataset.turn; });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
