import type { Metadata, Viewport } from "next";
import { LazyChat } from "@/components/LazyChat";
import { PageTurn } from "@/components/PageTurn";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SketchDefs } from "@/components/Sketch";
import "@fontsource-variable/onest/wght.css";
import "@fontsource-variable/inter-tight/wght.css";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Felt — a diary for how the day felt", template: "%s · Felt" },
  description: "Write about your day, add photographs and a song. Felt develops them into an artistic memory you can return to.",
};

export const viewport: Viewport = { themeColor: "#F6F5F0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SketchDefs />
        <SiteHeader />
        {children}
        <SiteFooter />
        <LazyChat />
        <PageTurn />
      </body>
    </html>
  );
}
