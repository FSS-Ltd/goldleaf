"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type Item = { href: string; label: string };

export function MobileNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  // Open state is tied to the page it was opened on, so navigating closes the menu without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenOn(open ? null : pathname)}
        className="grid size-12 place-items-center rounded-full border-2 border-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>
      <nav
        id="mobile-menu"
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-line bg-paper shadow-[0_18px_30px_-20px_rgba(6,69,29,0.35)]"
      >
        <ul className="wrap grid py-2">
          {items.map((n) => (
            <li key={n.href} className="border-b border-line last:border-0">
              <Link href={n.href} onClick={() => setOpenOn(null)} className="flex min-h-14 items-center text-lg font-medium">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
