"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function MobileMore({ section }: { section: string }) {
  const active =
    section === "staff" || section === "settings" || section === "invoices";
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative flex flex-1 justify-center">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="admin-more-menu"
        onClick={() => setOpen(!open)}
        className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-medium ${active ? "bg-[#ecd081]" : ""}`}
      >
        <span aria-hidden="true">•••</span>
        More
      </button>
      {open && (
        <div
          id="admin-more-menu"
          className="absolute bottom-full right-0 mb-3 w-40 rounded-lg border border-[#e3d7c3] bg-[#f8f3ee] p-2 shadow-lg"
        >
          <Link
            aria-current={section === "invoices" ? "page" : undefined}
            href="/admin/invoices"
            prefetch={false}
            className="block rounded-lg px-3 py-3 text-sm font-medium"
          >
            Invoices
          </Link>
          <Link
            aria-current={section === "staff" ? "page" : undefined}
            href="/admin/staff"
            prefetch={false}
            className="block rounded-lg px-3 py-3 text-sm font-medium"
          >
            Team
          </Link>
          <Link
            aria-current={section === "settings" ? "page" : undefined}
            href="/admin/billing-settings"
            prefetch={false}
            className="block rounded-lg px-3 py-3 text-sm font-medium"
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
