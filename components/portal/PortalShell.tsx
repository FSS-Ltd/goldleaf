import Image from "next/image";
import { AccountMenu } from "./auth/AccountMenu";
import { Home, Users, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PortalSessionGuard } from "./PortalSessionGuard";

export function PortalShell({ role, userId, children, section = "home" }: { role: "admin" | "parent" | "staff"; userId: string; children: ReactNode; section?: "home" | "staff" }) {
  const admin = role === "admin";
  const staff = role === "staff";
  const home = admin ? "/admin" : staff ? "/staff" : "/parent";
  const title = admin ? "Families" : staff ? "Today" : "Your family portal";
  return <div className="min-h-screen bg-[#fef8f3] text-[#06451d] md:pl-[232px]">
    <PortalSessionGuard userId={userId} />
    <a href="#main" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-[#06451d] px-4 py-3 text-white focus:translate-y-0">Skip to content</a>
    <aside className="hidden fixed inset-y-0 left-0 z-20 w-[232px] flex-col border-r border-[#e3d7c3] bg-[#f8f3ee] p-5 md:flex">
      <a href={home} className="block px-2 py-2" aria-label="Goldleaf portal home">
        <Image src="/brand/goldleaf-wordmark-trim.webp" alt="Goldleaf" width={1482} height={435} className="h-auto w-36" />
        <span className="mt-1 block text-xs text-[#35594a]">{admin ? "Admin portal" : staff ? "Staff portal" : "Your family portal"}</span>
      </a>
      <nav aria-label="Portal" className="mt-8">
        <a href={home} aria-current={section === "home" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#1b3022] ${section === "home" ? "bg-[#ecd081]" : ""}`}>
          {admin ? <Users size={19} aria-hidden="true" /> : <Home size={19} aria-hidden="true" />}{admin ? "Families" : staff ? "Today" : "Home"}
        </a>
        {admin && <a href="/admin/staff" aria-current={section === "staff" ? "page" : undefined} className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#1b3022] ${section === "staff" ? "bg-[#ecd081]" : ""}`}><UserRound size={19} aria-hidden="true" />Team</a>}
      </nav>
    </aside>
    <header className="flex h-16 items-center justify-between border-b border-[#e3d7c3] px-5 md:px-10">
      <a href={home} className="font-display text-xl md:text-sm">{section === "staff" ? "Team" : title}</a>
      <AccountMenu />
    </header>
    <main id="main" className="mx-auto max-w-7xl px-5 py-9 pb-28 md:px-10 md:pb-10">{children}</main>
    <nav aria-label="Portal" className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e3d7c3] bg-[#f8f3ee] px-5 py-2 md:hidden">
      <div className="flex gap-2"><a href={home} aria-current={section === "home" ? "page" : undefined} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-[#1b3022] ${section === "home" ? "bg-[#ecd081]" : ""}`}>
        {admin ? <Users size={19} aria-hidden="true" /> : <Home size={19} aria-hidden="true" />}{admin ? "Families" : staff ? "Today" : "Home"}
      </a>
      {admin && <a href="/admin/staff" aria-current={section === "staff" ? "page" : undefined} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-[#1b3022] ${section === "staff" ? "bg-[#ecd081]" : ""}`}><UserRound size={19} aria-hidden="true" />Team</a>}</div>
    </nav>
  </div>;
}
