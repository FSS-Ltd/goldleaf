import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { SessionControls } from "@/components/portal/learning/SessionControls";
import { PrivateNoteEditor } from "@/components/portal/learning/PrivateNoteEditor";
import { WorkspaceEditor } from "@/components/portal/learning/WorkspaceEditor";
import { readScopedSession, sessionBlocks } from "@/lib/portal/sessions";
import { readLearningWorkspace } from "@/lib/portal/learning";
import { requireRole } from "@/lib/portal/require-role";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = {
  title: "Session workspace",
  robots: { index: false, follow: false },
};
async function StaffSession({ params }: { params: Promise<{ id: string }> }) {
  const { identity, memberships } = await requireRole("staff");
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const session = await readScopedSession(parsed.data, "staff");
  if (!session) notFound();
  const workspace = await readLearningWorkspace(session.id);
  const when = formatUkSession(session.starts_at, session.duration_minutes);
  const labels = {
    scheduled: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <PortalShell
      role="staff"
      userId={identity.userId}
      memberships={memberships}
      section="sessions"
    >
      <a href="/staff" className="text-sm underline">
        Back to today
      </a>
      <h1 className="mt-5 !text-[clamp(2rem,4vw,2.6rem)]">
        {session.child_name}
      </h1>
      <p className="mt-3">
        {session.family_name ?? "Family"} · {when.day} · {when.time}
      </p>
      <p className="mt-2 text-sm">
        {labels[session.status]} · {session.duration_minutes} minutes
        {session.location_label && ` · ${session.location_label}`}
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <SessionControls session={session} actor={actor} />
          </section>
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Session routine</h2>
            <p className="mt-2 text-sm">
              Reference only; the routine does not run automatically.
            </p>
            <ol className="mt-4 divide-y divide-[#e3d7c3]">
              {sessionBlocks.map((block) => (
                <li key={block.name} className="py-3">
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {block.time} · {block.name}
                    </summary>
                    <p className="mt-2 text-sm">{block.what}</p>
                  </details>
                </li>
              ))}
            </ol>
          </section>
          <div className="flex gap-4 text-sm">
            <a href="#private-note" className="underline">
              Private note
            </a>
            <a href="#parent-update" className="underline">
              Parent update
            </a>
          </div>
        </div>
        <div className="space-y-6">
          <PrivateNoteEditor
            key={session.id}
            sessionId={session.id}
            actor={actor}
            note={workspace.note}
            version={workspace.note_version}
          />
          <WorkspaceEditor
            key={session.id}
            sessionId={session.id}
            actor={actor}
            childName={session.child_name}
            familyName={session.family_name ?? "family"}
            initial={workspace}
            operationId={randomUUID()}
          />
        </div>
      </div>
    </PortalShell>
  );
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="section wrap">Opening session…</main>}>
      <StaffSession params={params} />
    </Suspense>
  );
}
