import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#fef8f3]">
    <header className="border-b border-[#e3d7c3] px-5"><div className="mx-auto flex h-20 max-w-5xl items-center"><Link href="/" aria-label="Goldleaf home"><Image src="/brand/goldleaf-wordmark-trim.webp" alt="Goldleaf" width={1482} height={435} loading="eager" className="h-auto w-36" /></Link></div></header>
    <main id="main" className="flex flex-1 items-center justify-center px-5 py-12">{children}</main>
    <footer className="border-t border-[#e3d7c3] px-5 py-5 text-xs text-[#35594a]"><div className="mx-auto flex max-w-5xl justify-between gap-4"><span>© Goldleaf Learning</span><Link href="/privacy" className="underline">Privacy</Link></div></footer>
  </div>;
}
