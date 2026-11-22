"use client";

import { useState } from "react";
import { isMobile } from "@/lib/client/postcard";
import s from "./StoryButton.module.css";

/** "Share to Instagram Story": builds a 9:16 image and hands it to the share sheet (download on desktop). */
export function StoryButton({ make, label = "Instagram Story" }: { make: () => Promise<"shared" | "downloaded" | "cancelled">; label?: string }) {
  const [state, setState] = useState<"idle" | "drawing" | "shared" | "downloaded" | "error">("idle");

  const go = async () => {
    setState("drawing");
    try {
      const r = await make();
      setState(r === "cancelled" ? "idle" : r);
    } catch {
      setState("error");
    }
  };

  return (
    <span className={s.wrap}>
      <button type="button" className={s.btn} onClick={go} disabled={state === "drawing"}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
        </svg>
        {state === "drawing" ? "Making your story…" : label}
      </button>
      {state === "shared" && <span className={s.hint}>Shared ✓</span>}
      {state === "downloaded" && (
        <span className={s.hint}>
          {isMobile()
            ? "Saved to your photos — open Instagram → Your story → pick it."
            : "Saved. Send it to your phone, then Instagram → Your story → pick it from your gallery."}
        </span>
      )}
      {state === "error" && <span className={s.hint}>Could not make the image — try again.</span>}
    </span>
  );
}
