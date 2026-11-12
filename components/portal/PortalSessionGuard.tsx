"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function PortalSessionGuard({ userId }: { userId: string }) {
  const { isLoaded, user } = useUser();
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
