import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { onboardingScopeKey } from "@/lib/portal/onboarding-form-state";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { RevokeStaffForm, StaffAssignmentsForm, StaffInviteForm } from "@/components/portal/StaffForms";
import { listFamilies } from "@/lib/portal/families";
import { requireRole } from "@/lib/portal/require-role";
import { listStaffDeliveries, listStaffFamilyAssignments } from "@/lib/portal/staff";
import { listStaffProfiles } from "@/lib/portal/staff-profiles";
import { RevokeMembershipForm } from "@/components/portal/RevokeMembershipForm";
import { revokeAcceptedMember } from "../membership-actions";

export const metadata = { title: "Team", robots: { index: false, follow: false } };

function deliveryLabel(status: "sent" | "failed" | "pending") {
  if (status === "sent") return "Accepted by email provider";
  if (status === "failed") return "Email failed";
  return "Email pending or unconfirmed";
}

async function StaffAdmin({ searchParams }: { searchParams: Promise<{ staff?: string; access?: string }> }) {
  const { identity, memberships } = await requireRole("admin");
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const actorKey = onboardingScopeKey(actor);
  const [families, invitations, profiles, params] = await Promise.all([
    listFamilies(), listStaffDeliveries(), listStaffProfiles(), searchParams,
  ]);
  const requested = z.string().uuid().safeParse(params.staff);
  const selected = requested.success ? profiles.find((item) => item.id === requested.data && item.email) : undefined;
  const assigned = selected ? await listStaffFamilyAssignments(selected.id) : [];
  return (
    <PortalShell role="admin" userId={identity.userId} memberships={memberships} section="staff">
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Team</h1>
      {params.access === "removed" && <p role="status" className="mt-4 text-sm text-[#06451d]">Staff access and family assignments removed.</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Invite a staff member</h2>
            <p className="mt-3 text-sm text-[#35594a]">Staff can be assigned families after accepting their invitation.</p>
            <div className="mt-5">
              <StaffInviteForm key={actorKey} actor={actor} requestId={randomUUID()} />
            </div>
          </section>
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Accepted staff and family access</h2>
            {profiles.length ? (
              <form className="mt-4" method="get">
                <label className="block text-sm font-medium">
                  Choose accepted staff
                  <select className="mt-2 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3" name="staff" defaultValue={selected?.id ?? ""}>
                    <option value="">Select a staff member</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id} disabled={!profile.email}>
                        {profile.email ? `${profile.name ?? "Staff member"} · ${profile.email}` : "Verified account identity unavailable"}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-5 text-sm font-medium">Show family access</button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-[#35594a]">No staff members have accepted an invitation yet.</p>
            )}
            {selected && (
              <div className="mt-6">
                <p className="text-sm font-medium">{selected.name ?? "Staff member"}</p>
                <p className="mt-1 break-all text-sm text-[#35594a]">{selected.email}</p>
                {families.length ? (
                  <StaffAssignmentsForm key={onboardingScopeKey(actor, selected.id)} actor={actor} staffId={selected.id} families={families} assigned={assigned.map((family) => family.id)} />
                ) : (
                  <p className="mt-4 text-sm text-[#35594a]">There are no families to assign yet.</p>
                )}
                {selected.email && <RevokeMembershipForm key={onboardingScopeKey(actor, selected.id)} actor={actor} role="staff" label={selected.email} revoke={revokeAcceptedMember.bind(null, { role: "staff", membershipId: selected.id })} />}
              </div>
            )}
          </section>
        </div>
        <section className="h-fit rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
          <h2 className="!text-xl">Staff invitations</h2>
          {invitations.length ? (
            <ul className="mt-4 divide-y divide-[#e3d7c3]">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="space-y-3 py-4">
                  <p className="break-all text-sm font-medium">{invitation.email}</p>
                  <p className="text-sm text-[#35594a]">
                    {invitation.active ? "Active" : "No longer active"} · {deliveryLabel(invitation.delivery_status)}
                  </p>
                  <StaffInviteForm key={onboardingScopeKey(actor, invitation.id)} actor={actor} requestId={randomUUID()} email={invitation.email} />
                  {invitation.active && <RevokeStaffForm key={onboardingScopeKey(actor, invitation.id)} actor={actor} invitationId={invitation.id} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[#35594a]">No staff invitations yet.</p>
          )}
        </section>
      </div>
    </PortalShell>
  );
}

export default function AdminStaffPage({ searchParams }: { searchParams: Promise<{ staff?: string; access?: string }> }) {
  return (
    <Suspense fallback={<PortalLoading label="Opening team…" variant="list" />}>
      <StaffAdmin searchParams={searchParams} />
    </Suspense>
  );
}
