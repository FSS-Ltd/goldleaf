import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { CalendarDays, CircleAlert } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { StaffSessionCard } from "@/components/portal/staff-today/StaffSessionCard";
import { StaffTodayHeader } from "@/components/portal/staff-today/StaffTodayHeader";
import { requireRole } from "@/lib/portal/require-role";
import { listStaffSessions } from "@/lib/portal/sessions";
import { selectPrioritySession, selectTodaySessions } from "@/lib/portal/staff-today";
import { listAssignedStaffFamilies } from "@/lib/portal/staff";

async function StaffToday() {
  const { identity, memberships } = await requireRole("staff");
  const [families, sessions] = await Promise.all([
    listAssignedStaffFamilies(),
    listStaffSessions(),
  ]);
  const now = new Date();
  const todaysSessions = selectTodaySessions(sessions, now);
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
      <StaffTodayHeader
        date={date}
        sessionCount={todaysSessions.length}
        priority={priority}
      />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="staff-schedule">
          <h2 id="staff-schedule" className="flex items-center gap-3 !text-xl">
            <CalendarDays size={22} aria-hidden="true" />
            Today’s schedule
          </h2>
          {todaysSessions.length ? (
            <ul className="mt-4 space-y-4">
              {todaysSessions.map((session) => (
                <StaffSessionCard
                  key={session.id}
                  session={session}
                  priority={session.id === priority?.id}
                />
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
        <PortalLoading label="Opening your portal…" variant="dashboard" />
      }
    >
      <StaffToday />
    </Suspense>
  );
}
