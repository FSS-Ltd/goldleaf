import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { listStaffSessions } from "@/lib/portal/sessions";
import { requireRole } from "@/lib/portal/require-role";
import { sessionStatusLabel } from "@/lib/portal/session-status";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = {
  title: "Sessions",
  robots: { index: false, follow: false },
};
async function StaffSessions() {
  const { identity, memberships } = await requireRole("staff");
  const sessions = await listStaffSessions();
  return (
    <PortalShell
      role="staff"
      userId={identity.userId}
      memberships={memberships}
      section="sessions"
    >
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Sessions</h1>
      {sessions.length ? (
        <ul className="mt-7 space-y-3">
          {sessions.map((session) => {
            const when = formatUkSession(
              session.starts_at,
              session.duration_minutes,
            );
            return (
              <li key={session.id}>
                <a
                  className="block rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-5 [overflow-wrap:anywhere]"
                  href={`/staff/sessions/${session.id}`}
                >
                  <span className="font-medium">{session.child_name}</span>
                  <span className="mt-1 block text-sm">
                    {session.family_name ?? "Family"} · {when.day} · {when.time}{" "}
                    · {sessionStatusLabel(session.status)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-7">
          No sessions have been scheduled for your assigned families.
        </p>
      )}
    </PortalShell>
  );
}
export default function Page() {
  return (
    <Suspense
      fallback={<main className="section wrap">Opening sessions…</main>}
    >
      <StaffSessions />
    </Suspense>
  );
}
