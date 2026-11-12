"use client";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";
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
    return <PortalLoading label="Opening messages…" variant="messages" contentOnly />;
  return children;
}
