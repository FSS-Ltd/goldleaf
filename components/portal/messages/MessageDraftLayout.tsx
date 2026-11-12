import type { ReactNode } from "react";
import { DraftBoundary } from "./DraftBoundary";

export function MessageDraftLayout({
  role,
  children,
}: {
  role: "admin" | "parent" | "staff";
  children: ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return children;
  return <DraftBoundary role={role}>{children}</DraftBoundary>;
}
