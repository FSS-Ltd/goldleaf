"use client";

import type { RefObject } from "react";

export function ProtectGate({ container, active, cancel }: { container: RefObject<HTMLDivElement | null>; active: boolean; cancel: () => void }) {
  return <section hidden={!active} aria-label="Security verification" className="mt-5 rounded-lg border border-[#e3d7c3] bg-[#fef8f3] p-4">
    <p className="mb-3 text-sm">Complete the security check to continue.</p>
    <div ref={container} />
    <button type="button" onClick={cancel} className="mt-3 text-sm underline">Cancel</button>
  </section>;
}
