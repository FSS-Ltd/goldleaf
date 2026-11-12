import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { RegisterChildForm, ScheduleSessionForm } from "@/components/portal/learning/AdminLearningForms";
import { listFamilies } from "@/lib/portal/families";
import { listChildren } from "@/lib/portal/children";
import { listSessions } from "@/lib/portal/sessions";
import { requireRole } from "@/lib/portal/require-role";
import { formatUkSession } from "@/lib/portal/uk-time";

export const metadata = { title: "Children and sessions", robots: { index: false, follow: false } };
async function AdminChildren({ searchParams }: { searchParams: Promise<{ family?: string }> }) {
  const { identity, memberships } = await requireRole("admin");
  const [families, params] = await Promise.all([listFamilies(), searchParams]);
  const parsed = z.string().uuid().safeParse(params.family);
  const selected = parsed.success ? families.find((family) => family.id === parsed.data) : undefined;
  const [children, sessions] = selected ? await Promise.all([listChildren(selected.id), listSessions(selected.id)]) : [[], []];
  return <PortalShell role="admin" userId={identity.userId} memberships={memberships}>
    <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Children &amp; sessions</h1>
    <form method="get" className="mt-6 max-w-xl">
      <label className="block text-sm font-medium">Family<select className="mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3" name="family" defaultValue={selected?.id ?? ""}><option value="">Select a family</option>{families.map((family) => <option key={family.id} value={family.id}>{family.display_name ?? "Unnamed family"}</option>)}</select></label>
      <button className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-5 text-sm">Show family</button>
    </form>
    {selected ? <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6"><h2 className="!text-xl">Register a child</h2><p className="mt-3 text-sm">Family: {selected.display_name ?? "Unnamed family"}</p><RegisterChildForm key={selected.id} familyId={selected.id} requestId={randomUUID()} /></section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6"><h2 className="!text-xl">Schedule a session</h2><ScheduleSessionForm key={selected.id} children={children} requestId={randomUUID()} /></section>
      <section className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2"><h2 className="!text-xl">Scheduled sessions</h2>{sessions.length ? <ul className="mt-4 divide-y divide-[#e3d7c3]">{sessions.map((session) => { const when = formatUkSession(session.starts_at, session.duration_minutes); return <li key={session.id} className="py-3 text-sm">{children.find((child) => child.id === session.child_id)?.display_name ?? "Child"} · {when.day} · {when.time}</li>; })}</ul> : <p className="mt-4 text-sm">No sessions scheduled for this family yet.</p>}</section>
    </div> : <p className="mt-6 text-sm">Select a family to manage children and sessions.</p>}
  </PortalShell>;
}
export default function AdminChildrenPage({ searchParams }: { searchParams: Promise<{ family?: string }> }) {
  return <Suspense fallback={<main className="section wrap">Opening children and sessions…</main>}><AdminChildren searchParams={searchParams} /></Suspense>;
}
