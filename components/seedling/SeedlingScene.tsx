"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  letters: string[];
  /** Static stand-in shown before the 3D scene loads, and when it cannot run. */
  poster: React.ReactNode;
  label: string;
  maxGrowth?: number;
  scrollGrowth?: boolean;
  className?: string;
};

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SeedlingScene({ letters, poster, label, maxGrowth, scrollGrowth, className = "" }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = host.current;
    const outer = wrap.current;
    if (!el || !outer || !webglAvailable()) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    let idle = 0;

    const load = async () => {
      const { mountSeedling } = await import("./scene");
      if (cancelled) return;
      const family = getComputedStyle(document.body).getPropertyValue("--font-fraunces").trim() || "Georgia";
      try {
        await document.fonts.load(`600 100px ${family}`);
      } catch {
        /* the scene still draws with the fallback face */
      }
      if (cancelled) return;
      dispose = mountSeedling(el, {
        letters,
        fontFamily: family,
        maxGrowth,
        scrollGrowth,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onLost: () => setReady(false),
      });
      setReady(true);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const run = () => void load();
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 1200 });
        else idle = setTimeout(run, 300) as unknown as number;
      },
      { rootMargin: "200px" },
    );
    io.observe(outer);

    return () => {
      cancelled = true;
      io.disconnect();
      if (idle) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
        else clearTimeout(idle as unknown as ReturnType<typeof setTimeout>);
      }
      dispose?.();
      setReady(false);
    };
  }, [letters, maxGrowth, scrollGrowth]);

  return (
    <div ref={wrap} role="img" aria-label={label} className={`relative ${className}`}>
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>{poster}</div>
      <div ref={host} className={`absolute inset-[-6%] transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
