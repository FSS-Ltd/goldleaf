import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import * as adminActions from "@/app/(portal)/(provider)/admin/sessions/[id]/actions";
import * as staffActions from "@/app/(portal)/(provider)/staff/sessions/[id]/actions";
import { PortalShell } from "@/components/portal/PortalShell";
import { SessionControls } from "@/components/portal/learning/SessionControls";
import { PrivateNoteEditor } from "@/components/portal/learning/PrivateNoteEditor";
import { WorkspaceEditor } from "@/components/portal/learning/WorkspaceEditor";
import { readScopedSession, sessionBlocks } from "@/lib/portal/sessions";
import { readLearningWorkspace } from "@/lib/portal/learning";
import { requireRole } from "@/lib/portal/require-role";
import { formatUkSession } from "@/lib/portal/uk-time";

export async function SessionWorkspace({
  id,
  role,
}: {
  id: string;
  role: "admin" | "staff";
}) {
  const { identity, memberships } = await requireRole(role);
  const { sessionId: authSessionId } = await auth();
  if (!authSessionId) redirect("/sign-in");
  const actor = { userId: identity.userId, authSessionId };
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) notFound();
  const session = await readScopedSession(parsed.data, role);
  if (!session) notFound();
  const workspace = await readLearningWorkspace(session.id);
  const actions = role === "admin" ? adminActions : staffActions;
  const when = formatUkSession(session.starts_at, session.duration_minutes);
  const labels = {
    scheduled: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <PortalShell
      role={role}
      userId={identity.userId}
      memberships={memberships}
      section={role === "admin" ? "children" : "sessions"}
    >
      <a
        href={
          role === "admin"
            ? `/admin/children?family=${session.family_id}`
            : "/staff/sessions"
        }
        className="text-sm underline"
      >
        Back to sessions
      </a>
      <h1 className="mt-5 !text-[clamp(2rem,4vw,2.6rem)] [overflow-wrap:anywhere]">
        {session.child_name}
      </h1>
      <p className="mt-3 [overflow-wrap:anywhere]">
        {session.family_name ?? "Family"} · {when.day} · {when.time}
      </p>
      <p className="mt-2 text-sm">
        {labels[session.status]} · {session.duration_minutes} minutes
        {session.location_label && ` · ${session.location_label}`}
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <SessionControls
              session={session}
              actor={actor}
              actions={actions}
            />
          </section>
          <div className="flex gap-4 text-sm">
            <a href="#private-note" className="underline">
              Private note
            </a>
            <a href="#parent-update" className="underline">
              Parent update
            </a>
          </div>
          <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
            <h2 className="!text-xl">Session routine</h2>
            <p className="mt-2 text-sm">
              Reference timetable for the standard afternoon session; these clock times do not change this session’s scheduled time. The routine does not run automatically.
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
        </div>
        <div className="space-y-6 lg:col-span-2">
          <PrivateNoteEditor
            key={session.id}
            sessionId={session.id}
            actor={actor}
            actions={actions}
            note={workspace.note}
            version={workspace.note_version}
          />
          <WorkspaceEditor
            key={session.id}
            sessionId={session.id}
            actor={actor}
            actions={actions}
            sessionWhen={`${when.day} · ${when.time}`}
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
