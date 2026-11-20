import type { Metadata, Viewport } from "next";
import { Ambient } from "@/components/Ambient";
import { CloudMascot } from "@/components/CloudMascot";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Spotlight } from "@/components/Spotlight";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Felt — a diary for how the day felt", template: "%s · Felt" },
  description: "Write about your day, add photographs and a song. Felt develops them into an artistic memory you can return to.",
};

export const viewport: Viewport = { themeColor: "#12131C", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Caveat:wght@500;600&family=JetBrains+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,500..700&display=swap" rel="stylesheet" />
      </head>
      <body className="grain">
        <Ambient />
        <Spotlight />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CloudMascot />
      </body>
    </html>
  );
}
