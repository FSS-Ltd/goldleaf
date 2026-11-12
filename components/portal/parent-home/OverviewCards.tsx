import Link from "next/link";
import type { Child, Session } from "@/lib/portal/learning-schemas";
import { sessionStatusLabel } from "@/lib/portal/session-status";
import { formatUkSession } from "@/lib/portal/uk-time";

export function SessionCard({
  session,
  child,
}: {
  session: Session | undefined;
  child: Child | undefined;
}) {
  const when = session
    ? formatUkSession(session.starts_at, session.duration_minutes)
    : null;
  return (
    <section className="rounded-[18px] border border-[#d8c9ad] bg-[#f6eee2] p-6 sm:p-8">
      {session && child && when ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#766947]">
            {session.status === "in_progress"
              ? "Your current session"
              : "Your next session"}
          </p>
          <h2 className="mt-4 !text-3xl">Session for {child.display_name}</h2>
          <p className="mt-5 text-lg font-medium">{when.day}</p>
          <p className="mt-1 text-sm">
            {when.time} · {session.duration_minutes} minutes
          </p>
          {session.location_label && (
            <p className="mt-2 text-sm">{session.location_label}</p>
          )}
          <p className="mt-4 inline-block rounded-full bg-[#e5eadc] px-3 py-1 text-xs font-semibold text-[#365440]">
            {sessionStatusLabel(session.status)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              prefetch={false}
              className="btn btn-primary"
              href={`/parent/sessions/${session.id}`}
            >
              View session
            </Link>
            <Link
              prefetch={false}
              className="btn btn-ghost"
              href={`/parent/messages?family=${encodeURIComponent(session.family_id)}#request-button-${encodeURIComponent(session.id)}`}
            >
              Request a change
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-4 !text-2xl">No upcoming sessions scheduled</h2>
          <Link
            prefetch={false}
            className="mt-5 inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4"
            href="/parent/sessions"
          >
            View sessions
          </Link>
        </>
      )}
    </section>
  );
}

export function BillingCard({
  invoice,
}: {
  invoice: { number: number; status: string } | null;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-x-4 rounded-[18px] border border-[#e3d7c3] bg-[#f6eee2] p-5 sm:block sm:p-8">
      <div>
        <h2 className="!text-xl sm:!text-2xl">Billing</h2>
        {invoice ? (
          <p className="mt-5 text-sm">
            Invoice {invoice.number} · {invoice.status}
          </p>
        ) : (
          <p className="mt-5 text-sm">No invoices issued yet.</p>
        )}
      </div>
      <Link
        prefetch={false}
        className="inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4 sm:mt-5"
        href="/parent/billing"
      >
        View invoices
      </Link>
    </section>
  );
}
