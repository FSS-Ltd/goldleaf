import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ChildSelector } from "@/components/portal/learning/ChildSelector";
import { parentChildren } from "@/lib/portal/parent-children";
import { listSessions } from "@/lib/portal/sessions";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = {
  title: "Sessions",
  robots: { index: false, follow: false },
};
async function ParentSessions({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const [{ identity, memberships, families }, params] = await Promise.all([
    parentChildren(),
    searchParams,
  ]);
  const children = families.flatMap((item) =>
    item.children.map((child) => ({
      ...child,
      familyName:
        families.length > 1
          ? (item.family?.display_name ?? "Family")
          : undefined,
    })),
  );
  if (params.child && !children.some((item) => item.id === params.child))
    notFound();
  const child = params.child
    ? children.find((item) => item.id === params.child)
    : children.length === 1
      ? children[0]
      : undefined;
  const sessions = child
    ? (await listSessions(child.family_id)).filter(
        (item) => item.child_id === child.id,
      )
    : [];
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
      section="sessions"
    >
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Your sessions</h1>
      <ChildSelector options={children} selected={child?.id} />
      {child &&
        (sessions.length ? (
          <ul className="mt-7 space-y-3">
            {sessions.map((session) => {
              const when = formatUkSession(
                session.starts_at,
                session.duration_minutes,
              );
              return (
                <li key={session.id}>
                  <a
                    className="block rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-5"
                    href={`/parent/sessions/${session.id}`}
                  >
                    <span className="font-medium">{when.day}</span>
                    <span className="mt-1 block text-sm">{when.time}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-7">
            No sessions have been scheduled for {child.display_name} yet.
          </p>
        ))}
    </PortalShell>
  );
}
export default function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  return (
    <Suspense
      fallback={<main className="section wrap">Opening sessions…</main>}
    >
      <ParentSessions searchParams={searchParams} />
    </Suspense>
  );
}
