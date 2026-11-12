import type { ReactNode } from "react";
import { DraftBoundary } from "@/components/portal/messages/DraftBoundary";
export default function Layout({ children }: { children: ReactNode }) {
  return <DraftBoundary role="parent">{children}</DraftBoundary>;
}
