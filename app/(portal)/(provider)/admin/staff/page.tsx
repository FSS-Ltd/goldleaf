import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { RevokeStaffForm, StaffAssignmentsForm, StaffInviteForm } from "@/components/portal/StaffForms";
import { listFamilies } from "@/lib/portal/families";
import { requireRole } from "@/lib/portal/require-role";
import { listStaffDeliveries, listStaffFamilyAssignments } from "@/lib/portal/staff";
import { listStaffProfiles } from "@/lib/portal/staff-profiles";

export const metadata = { title: "Team", robots: { index: false, follow: false } };

async function StaffAdmin({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const { identity } = await requireRole("admin");
  const [families, invitations, profiles, params] = await Promise.all([listFamilies(), listStaffDeliveries(), listStaffProfiles(), searchParams]);
  const requested = z.string().uuid().safeParse(params.staff);
  const selected = requested.success ? profiles.find((item) => item.id === requested.data && item.email) : undefined;
  const assigned = selected ? await listStaffFamilyAssignments(selected.id) : [];
  return <PortalShell role="admin" userId={identity.userId} section="staff">
    <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Team</h1>
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
          <h2 className="!text-xl">Invite a staff member</h2>
          <p className="mt-3 text-sm text-[#35594a]">Staff can be assigned families after accepting their invitation.</p>
          <div className="mt-5"><StaffInviteForm requestId={randomUUID()} /></div>
        </section>
        <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
          <h2 className="!text-xl">Accepted staff and family access</h2>
          {profiles.length ? <form className="mt-4" method="get">
            <label className="block text-sm font-medium">Choose accepted staff<select className="mt-2 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3" name="staff" defaultValue={selected?.id ?? ""}><option value="">Select a staff member</option>{profiles.map((profile) => <option key={profile.id} value={profile.id} disabled={!profile.email}>{profile.email ? `${profile.name ?? "Staff member"} · ${profile.email}` : "Account identity unavailable"}</option>)}</select></label>
            <button className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-5 text-sm font-medium">Show family access</button>
          </form> : <p className="mt-4 text-sm text-[#35594a]">No staff members have accepted an invitation yet.</p>}
          {selected && <div className="mt-6"><p className="text-sm font-medium">{selected.name ?? "Staff member"}</p><p className="mt-1 break-all text-sm text-[#35594a]">{selected.email}</p>{families.length ? <StaffAssignmentsForm key={selected.id} staffId={selected.id} families={families} assigned={assigned.map((family) => family.id)} /> : <p className="mt-4 text-sm text-[#35594a]">There are no families to assign yet.</p>}</div>}
        </section>
      </div>
      <section className="h-fit rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
        <h2 className="!text-xl">Staff invitations</h2>
        {invitations.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{invitations.map((invitation) => <li key={invitation.id} className="space-y-3 py-4"><p className="break-all text-sm font-medium">{invitation.email}</p><p className="text-sm text-[#35594a]">{invitation.active ? "Active" : "No longer active"} · {invitation.delivery_status === "sent" ? "Accepted by email provider" : invitation.delivery_status === "failed" ? "Email failed" : "Email pending or unconfirmed"}</p><StaffInviteForm requestId={randomUUID()} email={invitation.email} />{invitation.active && <RevokeStaffForm invitationId={invitation.id} />}</li>)}</ul> : <p className="mt-4 text-sm text-[#35594a]">No staff invitations yet.</p>}
      </section>
    </div>
  </PortalShell>;
}
export default function AdminStaffPage({ searchParams }: { searchParams: Promise<{ staff?: string }> }) { return <Suspense fallback={<main className="section wrap"><p>Opening team…</p></main>}><StaffAdmin searchParams={searchParams} /></Suspense>; }
