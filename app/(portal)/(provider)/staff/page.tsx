import { Suspense } from "react";
import { ArrowRight, CalendarDays, CircleAlert, Clock } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/portal/require-role";
import { listStaffSessions } from "@/lib/portal/sessions";
import { sessionStatusLabel } from "@/lib/portal/session-status";
import { selectPrioritySession } from "@/lib/portal/staff-today";
import { formatUkSession } from "@/lib/portal/uk-time";
import { listAssignedStaffFamilies } from "@/lib/portal/staff";

async function StaffToday() {
  const { identity, memberships } = await requireRole("staff");
  const [families, sessions] = await Promise.all([
    listAssignedStaffFamilies(),
    listStaffSessions(),
  ]);
  const now = new Date();
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todaysSessions = sessions
    .filter(
      (session) =>
        dayKey.format(new Date(session.starts_at)) === dayKey.format(now),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const priority = selectPrioritySession(todaysSessions, now);
  const attention = todaysSessions.filter(
    (session) =>
      (session.status === "in_progress" || session.status === "completed") &&
      session.attendance === "not_recorded",
  );
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <PortalShell
      role="staff"
      userId={identity.userId}
      memberships={memberships}
    >
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#e3d7c3] pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526c5c]">
            Staff portal · {date}
          </p>
          <h1 className="mt-3 !text-[clamp(2rem,4vw,2.6rem)]">Today</h1>
          <p className="mt-2 text-sm text-[#35594a]">
            {todaysSessions.length}{" "}
            {todaysSessions.length === 1 ? "session" : "sessions"} scheduled
            today
          </p>
        </div>
        {priority && (
          <a
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#06451d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#123a20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06451d]"
            href={`/staff/sessions/${priority.id}`}
          >
            Open session{" "}
            <span className="font-normal">· {priority.child_name}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="staff-schedule">
          <h2 id="staff-schedule" className="flex items-center gap-3 !text-xl">
            <CalendarDays size={22} aria-hidden="true" />
            Today’s schedule
          </h2>
          {todaysSessions.length ? (
            <ul className="mt-4 space-y-4">
              {todaysSessions.map((session) => (
                <li
                  key={session.id}
                  className={`rounded-[14px] border bg-[#f6eee2] p-5 ${session.id === priority?.id ? "border-2 border-[#06451d]" : "border-[#e3d7c3]"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <h3 className="!text-lg">{session.child_name}</h3>
                      <p className="mt-2 flex items-center gap-2 text-sm text-[#35594a]">
                        <Clock size={16} aria-hidden="true" />
                        {
                          formatUkSession(
                            session.starts_at,
                            session.duration_minutes,
                          ).time
                        }
                      </p>
                      <p className="mt-1 text-sm text-[#35594a]">
                        {session.family_name ?? "Family"}
                        {session.location_label
                          ? ` · ${session.location_label}`
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#e5e9dc] px-3 py-1 text-xs font-semibold text-[#16462a]">
                      {sessionStatusLabel(session.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3d7c3] pt-4">
                    <span className="text-sm text-[#35594a]">
                      Attendance:{" "}
                      {session.attendance === "not_recorded"
                        ? "Not recorded"
                        : session.attendance === "present"
                          ? "Present"
                          : "Absent"}
                    </span>
                    <a
                      className="inline-flex min-h-10 items-center gap-2 font-semibold text-[#06451d] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                      href={`/staff/sessions/${session.id}`}
                    >
                      Open session <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-[#35594a]">
              No sessions scheduled for today.
            </p>
          )}
        </section>
        <div className="space-y-8">
          <section aria-labelledby="staff-attention">
            <h2
              id="staff-attention"
              className="flex items-center gap-3 !text-xl"
            >
              <CircleAlert size={22} aria-hidden="true" />
              Needs attention
            </h2>
            <div className="mt-4 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-5">
              {attention.length ? (
                <ul className="space-y-3">
                  {attention.map((session) => (
                    <li key={session.id}>
                      <a
                        className="text-sm underline"
                        href={`/staff/sessions/${session.id}`}
                      >
                        Record attendance for {session.child_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#35594a]">
                  No attendance checks need attention today.
                </p>
              )}
            </div>
          </section>
          <section aria-labelledby="staff-families">
            <h2 id="staff-families" className="!text-xl">
              Assigned families
            </h2>
            {families.length ? (
              <ul className="mt-4 divide-y divide-[#e3d7c3]">
                {families.map((family) => (
                  <li className="py-3 text-sm" key={family.id}>
                    {family.display_name ?? "Unnamed family"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[#35594a]">
                No families have been assigned to you yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening your portal…</p>
        </main>
      }
    >
      <StaffToday />
    </Suspense>
  );
}
