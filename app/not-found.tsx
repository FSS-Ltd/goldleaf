import type { Metadata } from "next";
import PublicNotFound from "@/components/PublicNotFound";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return <PublicShell><PublicNotFound /></PublicShell>;
}
