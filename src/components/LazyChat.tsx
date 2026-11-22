"use client";

import dynamic from "next/dynamic";

// The chat is not needed for the first paint — load it once the page is interactive.
export const LazyChat = dynamic(() => import("./FeltChat").then((m) => m.FeltChat), { ssr: false });
