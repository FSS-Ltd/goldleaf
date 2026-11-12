import { ViewTransition, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>
    <a href="#main" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-ink px-5 py-3 text-paper transition-transform focus:translate-y-0">Skip to content</a>
    <Header />
    <ViewTransition><main id="main" className="flex-1">{children}</main></ViewTransition>
    <Footer />
    <Analytics />
  </>;
}
