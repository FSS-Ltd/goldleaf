import { Suspense } from "react";
import { CalendarDays, CircleAlert } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/portal/require-role";
import { listStaffSessions } from "@/lib/portal/sessions";
import { formatUkSession } from "@/lib/portal/uk-time";
import { listAssignedStaffFamilies } from "@/lib/portal/staff";

async function StaffToday() {
  const { identity, memberships } = await requireRole("staff");
  const [families, sessions] = await Promise.all([listAssignedStaffFamilies(), listStaffSessions()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
  const currentDay = today.format(new Date());
  const todaysSessions = sessions.filter((session) => today.format(new Date(session.starts_at)) === currentDay);
  return <PortalShell role="staff" userId={identity.userId} memberships={memberships}>
    <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Today</h1>
    <p className="mt-3 text-sm text-[#35594a]">Your staff portal</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2" aria-labelledby="staff-schedule">
        <h2 id="staff-schedule" className="flex items-center gap-3 !text-xl"><CalendarDays size={22} aria-hidden="true" />Today’s schedule</h2>
        {todaysSessions.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{todaysSessions.map((session) => <li key={session.id}><a className="block py-4" href={`/staff/sessions/${session.id}`}><span className="font-medium">{session.child_name}</span><span className="mt-1 block text-sm">{formatUkSession(session.starts_at, session.duration_minutes).time} · {session.family_name ?? "Family"}</span></a></li>)}</ul> : <p className="mt-5 text-sm text-[#35594a]">No sessions scheduled for today.</p>}
      </section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6" aria-labelledby="staff-attention">
        <h2 id="staff-attention" className="flex items-center gap-3 !text-xl"><CircleAlert size={22} aria-hidden="true" />Needs attention</h2>
        <p className="mt-5 text-sm text-[#35594a]">Messages are not available here yet.</p>
      </section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2" aria-labelledby="staff-families">
        <h2 id="staff-families" className="!text-xl">Assigned families</h2>
        {families.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{families.map((family) => <li className="py-3 text-sm" key={family.id}>{family.display_name ?? "Unnamed family"}</li>)}</ul> : <p className="mt-4 text-sm text-[#35594a]">No families have been assigned to you yet.</p>}
      </section>
    </div>
  </PortalShell>;
}
export default function StaffPage() { return <Suspense fallback={<main className="section wrap"><p>Opening your portal…</p></main>}><StaffToday /></Suspense>; }
