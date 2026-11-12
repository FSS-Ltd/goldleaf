import { Suspense } from "react";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { InviteAcceptForm } from "@/components/portal/InviteAcceptForm";
import { getPortalSession } from "@/lib/portal/identity";
import { VerifyEmailNotice } from "@/components/portal/VerifyEmailNotice";

async function Invitation() {
  const hasCookie = Boolean((await cookies()).get("goldleaf_invite")?.value);
  if (!hasCookie) return <><h1>This invitation isn’t available</h1><p className="mt-4 text-[#35594a]">Ask Deborah for a new invitation.</p></>;
  const session = await getPortalSession();
  if (session.status === "unverified") return <VerifyEmailNotice retryUrl="/invite/accept" />;
  return session.status === "verified" ? <>
    <h1>Accept your invitation</h1>
    <p className="mt-4 text-sm text-[#35594a]">Signed in with verified account {session.identity.verifiedEmails.length === 1 ? "email" : "emails"}:</p>
    <ul className="mt-2 text-sm font-medium">{session.identity.verifiedEmails.map((email) => <li key={email}>{email}</li>)}</ul>
    <InviteAcceptForm />
  </> : <>
    <h1>You’re invited to Goldleaf</h1>
    <p className="mt-4 text-[#35594a]">Sign in or create an account to accept your invitation.</p>
    <div className="mt-8 grid gap-3">
      <Link className="rounded-lg bg-[#06451d] px-5 py-3 text-center font-medium text-white" href="/sign-in?redirect_url=%2Finvite%2Faccept">Sign in</Link>
      <Link className="rounded-lg border border-[#e3d7c3] bg-[#fef8f3] px-5 py-3 text-center font-medium text-[#06451d]" href="/sign-up">Create account</Link>
    </div>
  </>;
}

export default function AcceptPage() {
  return <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-12">
    <Link href="/" className="mb-10 block w-40"><Image src="/brand/goldleaf-wordmark-trim.webp" alt="Goldleaf" width={1482} height={435} /></Link>
    <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 md:p-8">
      <Suspense fallback={<p role="status">Checking your invitation…</p>}><Invitation /></Suspense>
    </section>
  </main>;
}
