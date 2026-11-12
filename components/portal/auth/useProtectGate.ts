"use client";

import { useEffect, useRef, useState } from "react";
import { resolveProtectChecks, type ProtectCheck } from "@/lib/portal/protect-check";
import { runProtectWidget } from "@/lib/portal/protect-widget";

type ProtectSource = {
  readonly protectCheck: ProtectCheck | null;
  submitProtectCheck(params: { proofToken: string }): Promise<{ error: unknown }>;
};

export function useProtectGate() {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [active, setActive] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);

  async function resolve(source: ProtectSource) {
    if (!source.protectCheck) return;
    const element = container.current;
    if (!element) throw new Error("Verification unavailable");
    const next = new AbortController();
    controller.current = next;
    setActive(true);
    try {
      await resolveProtectChecks(source, (check, signal) => runProtectWidget(check, element, signal), next.signal);
    } finally {
      if (controller.current === next) controller.current = null;
      setActive(false);
    }
  }

  return { container, active, resolve, cancel: () => controller.current?.abort() };
}
