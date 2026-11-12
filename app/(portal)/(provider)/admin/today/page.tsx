import { Suspense } from "react";
import { CalendarDays, CircleAlert } from "lucide-react";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { PortalShell } from "@/components/portal/PortalShell";
import { StaffSessionCard } from "@/components/portal/staff-today/StaffSessionCard";
import { StaffTodayHeader } from "@/components/portal/staff-today/StaffTodayHeader";
import { requireRole } from "@/lib/portal/require-role";
import { listAdminSessions } from "@/lib/portal/sessions";
import {
  selectPrioritySession,
  selectTodaySessions,
  ukDayKey,
} from "@/lib/portal/staff-today";

export const metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

async function AdminToday() {
  const { identity, memberships } = await requireRole("admin");
  const now = new Date();
  const sessions = await listAdminSessions(ukDayKey(now));
  const today = selectTodaySessions(sessions, now);
  const priority = selectPrioritySession(today, now);
  const attention = today.filter(
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
      role="admin"
      userId={identity.userId}
      memberships={memberships}
      section="today"
    >
      <StaffTodayHeader
        role="admin"
        date={date}
        sessionCount={today.length}
        priority={priority}
      />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="admin-schedule">
          <h2 id="admin-schedule" className="flex items-center gap-3 !text-xl">
            <CalendarDays size={22} aria-hidden="true" />
            Today’s schedule
          </h2>
          {today.length ? (
            <ul className="mt-4 space-y-4">
              {today.map((session) => (
                <StaffSessionCard
                  key={session.id}
                  role="admin"
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
        <section aria-labelledby="admin-attention">
          <h2 id="admin-attention" className="flex items-center gap-3 !text-xl">
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
                      href={`/admin/sessions/${session.id}`}
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
      </div>
    </PortalShell>
  );
}

export default function AdminTodayPage() {
  return (
    <Suspense
      fallback={<PortalLoading label="Opening your portal…" variant="dashboard" />}
    >
      <AdminToday />
    </Suspense>
  );
}
