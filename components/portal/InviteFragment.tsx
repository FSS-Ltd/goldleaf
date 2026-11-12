"use client";

import { useEffect, useState } from "react";
import { exchangeInvitation } from "@/app/(portal)/invite/actions";

export function InviteFragment() {
  const [status, setStatus] = useState<"checking" | "unavailable">("checking");
  useEffect(() => {
    const hasFragment = Boolean(window.location.hash);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token");
    const purpose = hash.get("purpose");
    if (hasFragment) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    async function check(): Promise<"checking" | "unavailable"> {
      if (!hasFragment) return "unavailable";
      if (await exchangeInvitation(token?.length === 43 ? token : "", purpose ?? "")) {
        window.location.replace("/invite/accept");
        return "checking";
      }
      return "unavailable";
    }
    void check().then(setStatus).catch(() => setStatus("unavailable"));
  }, []);
  if (status === "checking") return <p role="status">Checking your invitation…</p>;
  if (status === "unavailable") return <><h1>This invitation isn’t available</h1><p className="mt-4 text-[#35594a]">Ask Deborah for a new invitation.</p></>;
  return null;
}
