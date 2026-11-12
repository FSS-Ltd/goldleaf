import { onboardingScopeKey } from "@/lib/portal/onboarding-form-state";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { FoundingForm, InvitationActions } from "@/components/portal/AdminForms";
import { getFoundingAvailability } from "@/lib/founding-availability";
import { readFamily } from "@/lib/portal/families";
import { listFamilyInvitations } from "@/lib/portal/invitation-delivery";
import { requireRole } from "@/lib/portal/require-role";

async function FamilyDetail({ params }: { params: Promise<{ familyId: string }> }) {
  const { identity, memberships } = await requireRole("admin");
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const parsed = z.string().uuid().safeParse((await params).familyId);
  if (!parsed.success) notFound();
  const [family, invitations, availability] = await Promise.all([readFamily(parsed.data), listFamilyInvitations(parsed.data), getFoundingAvailability()]);
  if (!family) notFound();
  return <PortalShell role="admin" userId={identity.userId} memberships={memberships}>
    <a href="/admin" className="text-sm text-[#35594a] underline">Back to families</a>
    <h1 className="mt-5 !text-[clamp(2rem,4vw,2.6rem)]">{family.display_name ?? "Unnamed family"}</h1>
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <section className="rounded-[14px] border border-[#e3d7c3] bg-white p-6 lg:col-span-2">
        <h2 className="!font-sans !text-base font-medium">Parent invitations</h2>
        {invitations.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{invitations.map((invitation) => <li key={invitation.id} className="py-5"><p className="font-medium">{invitation.email}</p><p className="mt-1 text-sm text-[#35594a]">{invitation.active ? "Active" : "No longer active"} · {invitation.delivery_status === "sent" ? "Accepted by email provider" : invitation.delivery_status === "failed" ? "Email failed" : "Email pending or unconfirmed"}</p><InvitationActions key={onboardingScopeKey(actor, invitation.id)} actor={actor} familyId={family.id} invitationId={invitation.id} requestId={randomUUID()} email={invitation.email} active={invitation.active} /></li>)}</ul> : <p className="mt-4 text-sm text-[#35594a]">No invitations yet.</p>}
      </section>
      <section className="h-fit rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
        <h2 className="!font-sans !text-base font-medium">Founding status</h2>
        <p className="mt-3 text-sm text-[#35594a]">{family.is_founding ? "Founding family" : "Standard family"}</p>
        <p className="mt-2 text-sm text-[#35594a]">{availability ? `${availability.remaining} of ${availability.total} places available` : "Availability is currently unavailable."}</p>
        <div className="mt-5"><FoundingForm key={onboardingScopeKey(actor, family.id)} actor={actor} familyId={family.id} founding={family.is_founding} full={availability?.remaining === 0} /></div>
      </section>
    </div>
  </PortalShell>;
}
export default function FamilyPage({ params }: { params: Promise<{ familyId: string }> }) { return <Suspense fallback={<main className="section wrap"><p>Opening family…</p></main>}><FamilyDetail params={params} /></Suspense>; }
