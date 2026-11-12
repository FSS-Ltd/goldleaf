import Image from "next/image";
import Link from "next/link";
import { InviteFragment } from "@/components/portal/InviteFragment";

export default function InvitePage() {
  return <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-12">
    <Link href="/" className="mb-10 block w-40"><Image src="/brand/goldleaf-wordmark-trim.webp" alt="Goldleaf" width={1482} height={435} /></Link>
    <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 md:p-8">
      <noscript><p>JavaScript is needed to open an invitation securely. Please enable it and open the link again.</p></noscript>
      <InviteFragment />
    </section>
  </main>;
}
