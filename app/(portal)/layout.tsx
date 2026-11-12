import type { ReactNode } from "react";

export const metadata = { robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: ReactNode }) {
  return children;
}
