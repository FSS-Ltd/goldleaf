"use client";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";

import { useEffect, useRef, useState } from "react";
import { exchangeInvitation } from "@/app/(portal)/invite/actions";

export function InviteFragment() {
  const [status, setStatus] = useState<"checking" | "unavailable">("checking");
  const exchange = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    if (!exchange.current) {
      const hasFragment = Boolean(window.location.hash);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const token = hash.get("token");
      const purpose = hash.get("purpose");
      if (hasFragment) window.history.replaceState(null, "", window.location.pathname + window.location.search);
      exchange.current = exchangeInvitation(hasFragment && token?.length === 43 ? token : "", hasFragment ? purpose ?? "" : "");
    }
    let active = true;
    void exchange.current.then((accepted) => {
      if (!active) return;
      if (accepted) window.location.replace("/invite/accept");
      else setStatus("unavailable");
    }).catch(() => { if (active) setStatus("unavailable"); });
    return () => { active = false; };
  }, []);
  if (status === "checking") return <PortalLoading label="Checking your invitation…" variant="account" contentOnly />;
  if (status === "unavailable") return <><h1>This invitation isn’t available</h1><p className="mt-4 text-[#35594a]">Ask Deborah for a new invitation.</p></>;
  return null;
}
