import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { DraftComposer } from "@/components/portal/invoices/DraftComposer";
import { readBillingSettings } from "@/lib/portal/billing-settings";
import { listFamilies } from "@/lib/portal/families";
import { requireRole } from "@/lib/portal/require-role";
async function CreateInvoice() {
  const { identity, memberships } = await requireRole("admin");
  const [families, settings] = await Promise.all([
    listFamilies(),
    readBillingSettings(),
  ]);
  return (
    <PortalShell
      role="admin"
      userId={identity.userId}
      memberships={memberships}
      section="invoices"
    >
      <Link href="/admin/invoices" className="text-sm underline">
        Back to invoices
      </Link>
      <h1 className="my-6 !text-[clamp(2rem,4vw,2.6rem)]">New invoice</h1>
      {families.length ? (
        <DraftComposer
          families={families}
          settings={settings}
          initialOperationId={randomUUID()}
        />
      ) : (
        <p>
          No families are available.{" "}
          <Link href="/admin" className="underline">
            Create a family
          </Link>{" "}
          before starting an invoice.
        </p>
      )}
    </PortalShell>
  );
}
export const metadata = { title: "New invoice" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening invoice form…" variant="detail" />
      }
    >
      <CreateInvoice />
    </Suspense>
  );
}
