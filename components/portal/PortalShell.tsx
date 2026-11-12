import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "./auth/AccountMenu";
import { Home, ReceiptText, Settings, Users, UserRound, CalendarDays, BookOpen, Baby } from "lucide-react";
import type { ReactNode } from "react";
import { PortalSessionGuard } from "./PortalSessionGuard";

type Section = "home" | "staff" | "invoices" | "settings" | "billing" | "children" | "sessions" | "learning";
export function PortalShell({
  role,
  userId,
  memberships,
  children,
  section = "home",
}: {
  role: "admin" | "parent" | "staff";
  userId: string;
  memberships: { role: "admin" | "parent" | "staff" }[];
  children: ReactNode;
  section?: Section;
}) {
  const admin = role === "admin";
  const staff = role === "staff";
  const home = admin ? "/admin" : staff ? "/staff" : "/parent";
  const title = admin ? "Families" : staff ? "Today" : "Your family portal";
  const links: {
    href: string;
    label: string;
    section: Section;
    icon: typeof Home;
  }[] = [
    {
      href: home,
      label: admin ? "Families" : staff ? "Today" : "Home",
      section: "home",
      icon: admin ? Users : Home,
    },
    ...(admin
      ? [
          {
            href: "/admin/children",
            label: "Children",
            section: "children" as const,
            icon: Baby,
          },
          {
            href: "/admin/staff",
            label: "Team",
            section: "staff" as const,
            icon: UserRound,
          },
          {
            href: "/admin/invoices",
            label: "Invoices",
            section: "invoices" as const,
            icon: ReceiptText,
          },
          {
            href: "/admin/billing-settings",
            label: "Settings",
            section: "settings" as const,
            icon: Settings,
          },
        ]
      : staff
        ? [{ href: "/staff/sessions", label: "Sessions", section: "sessions" as const, icon: CalendarDays }]
        : [
            { href: "/parent/sessions", label: "Sessions", section: "sessions" as const, icon: CalendarDays },
            { href: "/parent/learning", label: "Learning", section: "learning" as const, icon: BookOpen },
            {
              href: "/parent/billing",
              label: "Billing",
              section: "billing" as const,
              icon: ReceiptText,
            },
          ]),
  ];
  const current = links.find((link) => link.section === section);
  return (
    <div className="min-h-screen bg-[#fef8f3] text-[#06451d] md:pl-[232px]">
      <PortalSessionGuard userId={userId} />
      <a
        href="#main"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-[#06451d] px-4 py-3 text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="hidden fixed inset-y-0 left-0 z-20 w-[232px] flex-col border-r border-[#e3d7c3] bg-[#f8f3ee] p-5 md:flex">
        <a
          href={home}
          className="block px-2 py-2"
          aria-label="Goldleaf portal home"
        >
          <Image
            src="/brand/goldleaf-wordmark-trim.webp"
            alt="Goldleaf"
            width={1482}
            height={435}
            className="h-auto w-36"
          />
          <span className="mt-1 block text-xs text-[#35594a]">
            {admin
              ? "Admin portal"
              : staff
                ? "Staff portal"
                : "Your family portal"}
          </span>
        </a>
        <nav aria-label="Portal" className="mt-8 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={section === link.section ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#1b3022] ${section === link.section ? "bg-[#ecd081]" : ""}`}
            >
              <link.icon size={19} aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <header className="flex h-16 items-center justify-between border-b border-[#e3d7c3] px-5 md:px-10">
        <a
          href={current?.href ?? home}
          className="font-display text-xl md:text-sm"
        >
          {section === "home" ? title : (current?.label ?? title)}
        </a>
        <AccountMenu
          roles={memberships.map((membership) => membership.role)}
          currentRole={role}
        />
      </header>
      <main
        id="main"
        className="mx-auto max-w-7xl px-5 py-9 pb-28 md:px-10 md:pb-10"
      >
        {children}
      </main>
      <nav
        aria-label="Portal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e3d7c3] bg-[#f8f3ee] px-2 py-2 md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={section === link.section ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-medium text-[#1b3022] ${section === link.section ? "bg-[#ecd081]" : ""}`}
            >
              <link.icon size={19} className="shrink-0" aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
