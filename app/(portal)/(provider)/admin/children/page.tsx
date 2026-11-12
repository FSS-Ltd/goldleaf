import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { z } from "zod";
import { FamilySelector } from "@/components/portal/admin/FamilySelector";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  RegisterChildForm,
  ScheduleSessionForm,
} from "@/components/portal/learning/AdminLearningForms";
import { listFamilies } from "@/lib/portal/families";
import { listChildren } from "@/lib/portal/children";
import { listSessions } from "@/lib/portal/sessions";
import { requireRole } from "@/lib/portal/require-role";
import { sessionStatusLabel } from "@/lib/portal/session-status";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = {
  title: "Children and sessions",
  robots: { index: false, follow: false },
};
async function AdminChildren({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  const { identity, memberships } = await requireRole("admin");
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const [families, params] = await Promise.all([listFamilies(), searchParams]);
  const parsed = z.string().uuid().safeParse(params.family);
  const selected = parsed.success
    ? families.find((family) => family.id === parsed.data)
    : undefined;
  const [children, sessions] = selected
    ? await Promise.all([listChildren(selected.id), listSessions(selected.id)])
    : [[], []];
  return (
    <PortalShell
      role="admin"
      userId={identity.userId}
      memberships={memberships}
      section="children"
    >
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">
        Children &amp; sessions
      </h1>
      {families.length > 0 && (
        <FamilySelector families={families} selectedId={selected?.id ?? ""} />
      )}
      {families.length === 0 ? (
        <p className="mt-6 text-sm">
          No families have been added yet.{" "}
          <Link href="/admin" prefetch={false} className="underline">
            Create a family
          </Link>{" "}
          first.
        </p>
      ) : selected ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Register a child</h2>
            <p className="mt-3 text-sm">
              Family: {selected.display_name ?? "Unnamed family"}
            </p>
            <RegisterChildForm
              actor={actor}
              key={selected.id}
              familyId={selected.id}
              requestId={randomUUID()}
            />
          </section>
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Schedule a session</h2>
            <ScheduleSessionForm
              actor={actor}
              key={selected.id}
              childOptions={children}
              requestId={randomUUID()}
            />
          </section>
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2">
            <h2 className="!text-xl">Sessions</h2>
            {sessions.length ? (
              <ul className="mt-4 divide-y divide-[#e3d7c3]">
                {sessions.map((session) => {
                  const when = formatUkSession(
                    session.starts_at,
                    session.duration_minutes,
                  );
                  return (
                    <li key={session.id} className="py-3 text-sm">
                      <a
                        className="underline"
                        href={`/admin/sessions/${session.id}`}
                      >
                        {children.find((child) => child.id === session.child_id)
                          ?.display_name ?? "Child"}{" "}
                        · {when.day} · {when.time} ·{" "}
                        {sessionStatusLabel(session.status)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm">
                No sessions scheduled for this family yet.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className="mt-6 text-sm">
          Select a family to manage children and sessions.
        </p>
      )}
    </PortalShell>
  );
}
export default function AdminChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening children and sessions…" variant="list" />
      }
    >
      <AdminChildren searchParams={searchParams} />
    </Suspense>
  );
}
