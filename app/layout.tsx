import type { Metadata, Viewport } from "next";
import { Fraunces, Lexend } from "next/font/google";
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

const description = "Small-group and one-to-one, play-based phonics, maths and music tutoring for 2 to 4 year olds in Ashford, Kent. At a local church, with one-to-one sessions also available at home.";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: {
    default: `${site.service}, ${areaLabel}`,
    template: `%s | ${site.service}, ${site.area.town}`,
  },
  description,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
    description,
  },
  twitter: { card: "summary_large_image", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${lexend.variable}`}>
      <body className="flex min-h-screen flex-col">
        {children}
      </body>
    </html>
  );
}
