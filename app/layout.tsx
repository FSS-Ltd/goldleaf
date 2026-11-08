import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Fraunces, Lexend } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site, areaLabel } from "@/content/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#fef8f3" };

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: {
    default: `${site.service}, ${areaLabel}`,
    template: `%s | ${site.service}, ${site.area.town}`,
  },
  description:
    "One-to-one, play-based phonics, maths and music tutoring for 2 to 4 year olds in Ashford, Kent. In your home or at a local church.",
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${lexend.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-paper"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          <ViewTransition>{children}</ViewTransition>
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
