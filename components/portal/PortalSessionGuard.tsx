"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { clearPaymentStorage } from "@/lib/portal/payment-storage";

export function PortalSessionGuard({ userId }: { userId: string }) {
  const { isLoaded, user } = useUser();
  const { isLoaded: authLoaded, userId: currentUserId, sessionId } = useAuth();
  useEffect(() => {
    if (!authLoaded) return;
    try {
      clearPaymentStorage(
        sessionStorage,
        currentUserId && sessionId
          ? { userId: currentUserId, sessionId }
          : undefined,
      );
    } catch {
      /* Browser storage may be unavailable. */
    }
  }, [authLoaded, currentUserId, sessionId]);
  useEffect(() => {
    if (isLoaded && user?.id !== userId) window.location.replace("/sign-in");
  }, [isLoaded, user?.id, userId]);
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
