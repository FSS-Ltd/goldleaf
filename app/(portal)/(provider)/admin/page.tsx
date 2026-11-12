import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { onboardingScopeKey } from "@/lib/portal/onboarding-form-state";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { CreateFamilyForm } from "@/components/portal/AdminForms";
import { listFamilies } from "@/lib/portal/families";
import { requireRole } from "@/lib/portal/require-role";
import { getFoundingAvailability } from "@/lib/founding-availability";

async function AdminHome() {
  const { identity, memberships } = await requireRole("admin");
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const actorKey = onboardingScopeKey(actor);
  const [families, availability] = await Promise.all([listFamilies(), getFoundingAvailability()]);
  return <PortalShell role="admin" userId={identity.userId} memberships={memberships}>
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Families</h1>
        <p className="mt-3 text-sm text-[#35594a]">Create a family and invite a parent to join their portal.</p>
        <div className="mt-7 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] px-5 py-4 text-sm" aria-label="Founding availability">
          {availability ? `${availability.remaining} of ${availability.total} founding places available` : "Founding availability is currently unavailable."}
        </div>
        <div className="mt-6"><CreateFamilyForm key={actorKey} actor={actor} familyId={randomUUID()} full={availability?.remaining === 0} /></div>
      </div>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:mt-1" aria-labelledby="family-list-title">
        <h2 id="family-list-title" className="!font-sans !text-base font-medium">Family list</h2>
        {families.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{families.map((family) => <li key={family.id} className="py-4"><a href={`/admin/families/${family.id}`} className="font-medium underline decoration-[#c9971c] underline-offset-4">{family.display_name ?? "Unnamed family"}</a><p className="mt-1 text-xs text-[#35594a]">{family.is_founding ? "Founding family" : "Standard family"}</p></li>)}</ul> : <p className="mt-4 text-sm text-[#35594a]">No families yet.</p>}
      </section>
    </div>
  </PortalShell>;
}
export default function AdminPage() { return <Suspense fallback={<PortalLoading label="Opening families…" variant="list" />}><AdminHome /></Suspense>; }
