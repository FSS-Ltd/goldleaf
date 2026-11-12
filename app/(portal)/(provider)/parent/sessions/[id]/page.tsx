import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { readScopedSession } from "@/lib/portal/sessions";
import { requireRole } from "@/lib/portal/require-role";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = {
  title: "Session",
  robots: { index: false, follow: false },
};
async function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { identity, memberships } = await requireRole("parent");
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) notFound();
  const session = await readScopedSession(id.data, "parent");
  if (
    !session ||
    !memberships.some(
      (item) => item.role === "parent" && item.family_id === session.family_id,
    )
  )
    notFound();
  const when = formatUkSession(session.starts_at, session.duration_minutes);
  const labels = {
    scheduled: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
      section="sessions"
    >
      <Link
        prefetch={false}
        href="/parent/sessions"
        className="text-sm underline"
      >
        Back to sessions
      </Link>
      <h1 className="mt-5 !text-[clamp(2rem,4vw,2.6rem)] [overflow-wrap:anywhere]">
        Session for {session.child_name}
      </h1>
      <section className="mt-7 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
        <p>{labels[session.status]}</p>
        <p className="mt-3">
          {when.day} · {when.time}
        </p>
        <p className="mt-3 text-sm">{session.duration_minutes} minutes</p>
        {session.location_label && (
          <p className="mt-3 text-sm">Location: {session.location_label}</p>
        )}
      </section>
    </PortalShell>
  );
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="section wrap">Opening session…</main>}>
      <SessionDetail params={params} />
    </Suspense>
  );
}
