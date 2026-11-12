import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  LearningCard,
  NoteCard,
} from "@/components/portal/parent-home/LearningCards";
import {
  BillingCard,
  SessionCard,
} from "@/components/portal/parent-home/OverviewCards";
import { parentChildren } from "@/lib/portal/parent-children";
import { listSessions } from "@/lib/portal/sessions";
import { listParentLatestLearning } from "@/lib/portal/learning";
import { listParentInvoices } from "@/lib/portal/invoices";
import { invoicePaymentStatus } from "@/lib/portal/invoice-status";
import { selectParentHomeData } from "@/lib/portal/parent-home-selection";
import { currentUkTime } from "@/lib/portal/uk-time";

async function ParentHome() {
  const { identity, memberships, families } = await parentChildren();
  const children = families.flatMap((item) => item.children);
  const [familySessions, childUpdates, invoices] = await Promise.all([
    Promise.all(
      families.map((item) =>
        item.family ? listSessions(item.family.id) : Promise.resolve([]),
      ),
    ),
    listParentLatestLearning(),
    listParentInvoices(),
  ]);
  const { next, latest } = selectParentHomeData(
    familySessions.flat(),
    childUpdates,
    children,
    currentUkTime(),
  );
  const invoice = invoices[0];
  const payment = invoice
    ? invoicePaymentStatus(invoice.snapshot.total_pence, invoice.paid_pence)
    : null;
  const billing = invoice
    ? {
        number: invoice.snapshot.number,
        status:
          payment === "partially-paid"
            ? "Partially paid"
            : payment === "paid"
              ? "Paid"
              : "Unpaid",
      }
    : null;
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
    >
      <h1 className="sr-only">Your family portal</h1>
      {children.length === 0 && (
        <p className="mt-4 text-sm">
          No children have been added to your family yet.
        </p>
      )}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 [overflow-wrap:anywhere] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <SessionCard
            session={next}
            child={children.find((child) => child.id === next?.child_id)}
          />
          <LearningCard latest={latest} />
        </div>
        <div className="min-w-0 space-y-6">
          <NoteCard latest={latest} />
          <BillingCard invoice={billing} />
        </div>
      </div>
    </PortalShell>
  );
}
export default function ParentPage() {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening your family portal…" variant="dashboard" />
      }
    >
      <ParentHome />
    </Suspense>
  );
}
