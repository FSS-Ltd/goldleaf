import { Suspense } from "react";
import { CalendarDays, CircleAlert } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/portal/require-role";
import { listAssignedStaffFamilies } from "@/lib/portal/staff";

async function StaffToday() {
  const { identity } = await requireRole("staff");
  const families = await listAssignedStaffFamilies();
  return <PortalShell role="staff" userId={identity.userId}>
    <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Today</h1>
    <p className="mt-3 text-sm text-[#35594a]">Your staff portal</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2" aria-labelledby="staff-schedule">
        <h2 id="staff-schedule" className="flex items-center gap-3 !text-xl"><CalendarDays size={22} aria-hidden="true" />Today’s schedule</h2>
        <p className="mt-5 text-sm text-[#35594a]">Sessions are not available here yet.</p>
      </section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6" aria-labelledby="staff-attention">
        <h2 id="staff-attention" className="flex items-center gap-3 !text-xl"><CircleAlert size={22} aria-hidden="true" />Needs attention</h2>
        <p className="mt-5 text-sm text-[#35594a]">Updates are not available here yet.</p>
      </section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2" aria-labelledby="staff-families">
        <h2 id="staff-families" className="!text-xl">Assigned families</h2>
        {families.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{families.map((family) => <li className="py-3 text-sm" key={family.id}>{family.display_name ?? "Unnamed family"}</li>)}</ul> : <p className="mt-4 text-sm text-[#35594a]">No families have been assigned to you yet.</p>}
      </section>
    </div>
  </PortalShell>;
}
export default function StaffPage() { return <Suspense fallback={<main className="section wrap"><p>Opening your portal…</p></main>}><StaffToday /></Suspense>; }
