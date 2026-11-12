"use client";
import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import type { ActionActor } from "@/lib/portal/action-actor-state";

export function ActorScope({
  actor,
  children,
}: {
  actor: ActionActor;
  children: ReactNode;
}) {
  const { isLoaded, userId, sessionId } = useAuth();
  if (!isLoaded || userId !== actor.userId || sessionId !== actor.authSessionId)
    return <p role="status">Opening messages…</p>;
  return children;
}
