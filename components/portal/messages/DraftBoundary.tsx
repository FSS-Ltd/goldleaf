"use client";
import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { DraftProvider } from "./DraftProvider";

// The route layout survives search changes, refreshes and page-level errors.
export function DraftBoundary({
  role,
  children,
}: {
  role: "admin" | "parent" | "staff";
  children: ReactNode;
}) {
  const { isLoaded, userId, sessionId } = useAuth();
  if (!isLoaded || !userId || !sessionId)
    return <p role="status">Opening messages…</p>;
  return (
    <DraftProvider key={`${userId}:${sessionId}:${role}`}>
      {children}
    </DraftProvider>
  );
}
