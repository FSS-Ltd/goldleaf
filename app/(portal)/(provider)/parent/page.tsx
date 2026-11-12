import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { parentChildren } from "@/lib/portal/parent-children";
import { listSessions } from "@/lib/portal/sessions";
import { listPublishedLearning } from "@/lib/portal/learning";
import { listParentInvoices } from "@/lib/portal/invoices";
import { invoicePaymentStatus } from "@/lib/portal/invoice-status";
import { currentUkTime, formatUkSession } from "@/lib/portal/uk-time";

async function ParentHome() {
  const { identity, memberships, families } = await parentChildren();
  const children = families.flatMap((item) => item.children);
  const [familySessions, childUpdates, invoices] = await Promise.all([
    Promise.all(families.map((item) => listSessions(item.family!.id))),
    Promise.all(
      children.map(async (child) => ({
        child,
        updates: await listPublishedLearning(child.family_id, child.id),
      })),
    ),
    listParentInvoices(),
  ]);
  const now = currentUkTime();
  const next = familySessions
    .flat()
    .filter(
      (session) =>
        (session.status === "scheduled" || session.status === "in_progress") &&
        Date.parse(session.starts_at) + session.duration_minutes * 60000 >= now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const latest = childUpdates
    .flatMap(({ child, updates }) =>
      updates.map((update) => ({ child, update })),
    )
    .sort(
      (a, b) =>
        Date.parse(b.update.published_at) - Date.parse(a.update.published_at),
    )[0];
  const invoice = invoices[0];
  const payment = invoice
    ? invoicePaymentStatus(invoice.snapshot.total_pence, invoice.paid_pence)
    : null;
  const when = next
    ? formatUkSession(next.starts_at, next.duration_minutes)
    : null;
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
    >
      <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Your family portal</h1>
      {children.length === 0 && (
        <p className="mt-4 text-sm">
          No children have been added to your family yet.
        </p>
      )}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="min-h-36 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2">
          <h2 className="!font-sans !text-base font-medium">Next session</h2>
          {next && when ? (
            <p className="mt-5">
              {children.find((child) => child.id === next.child_id)
                ?.display_name ?? "Child"}{" "}
              · {when.day} · {when.time}
            </p>
          ) : (
            <p className="mt-5 text-sm">No upcoming sessions scheduled.</p>
          )}
          <Link
            prefetch={false}
            className="mt-4 inline-block text-sm underline"
            href="/parent/sessions"
          >
            View sessions
          </Link>
        </section>
        <section className="min-h-36 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
          <h2 className="!font-sans !text-base font-medium">Billing</h2>
          {invoice ? (
            <p className="mt-5 text-sm">
              Invoice {invoice.snapshot.number} ·{" "}
              {payment === "partially-paid"
                ? "Partially paid"
                : payment === "paid"
                  ? "Paid"
                  : "Unpaid"}
            </p>
          ) : (
            <p className="mt-5 text-sm">No invoices issued yet.</p>
          )}
          <Link
            prefetch={false}
            className="mt-4 inline-block text-sm underline"
            href="/parent/billing"
          >
            View invoices
          </Link>
        </section>
        <section className="min-h-36 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6 lg:col-span-2">
          <h2 className="!font-sans !text-base font-medium">
            Latest tutor note
          </h2>
          {latest ? (
            <>
              <p className="mt-5 text-sm">
                {latest.child.display_name} ·{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeZone: "Europe/London",
                }).format(new Date(latest.update.published_at))}
              </p>
              <p className="mt-3 whitespace-pre-wrap">{latest.update.body}</p>
            </>
          ) : (
            <p className="mt-5 text-sm">No learning updates shared yet.</p>
          )}
          <a
            className="mt-4 inline-block text-sm underline"
            href="/parent/learning"
          >
            View learning
          </a>
        </section>
        <section className="min-h-36 rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
          <h2 className="!font-sans !text-base font-medium">
            Latest shared focus
          </h2>
          {latest?.update.focus ? (
            <p className="mt-5">{latest.update.focus}</p>
          ) : (
            <p className="mt-5 text-sm">No focus has been shared yet.</p>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
export default function ParentPage() {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening your family portal…</p>
        </main>
      }
    >
      <ParentHome />
    </Suspense>
  );
}
