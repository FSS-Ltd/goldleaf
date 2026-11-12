import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { AdminDraftInvoice } from "@/components/portal/invoices/AdminDraftInvoice";
import { AdminIssuedInvoice } from "@/components/portal/invoices/AdminIssuedInvoice";
import { listInvoiceNotifications } from "@/lib/portal/invoice-notifications";
import {
  listInvoicePayments,
  listInvoicePaymentIntents,
  previewSavedInvoice,
  readAdminInvoice,
} from "@/lib/portal/invoices";
import { requireRole } from "@/lib/portal/require-role";
import { readFamily } from "@/lib/portal/families";
import {
  BillingConfigurationError,
  InvoiceQuoteMismatchError,
} from "@/lib/portal/invoice-quote";

async function Detail({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { identity, memberships } = await requireRole("admin");
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).invoiceId);
  if (!parsed.success) notFound();
  const invoice = await readAdminInvoice(parsed.data);
  if (!invoice) notFound();
  const family = await readFamily(invoice.family_id);
  const issued = invoice.snapshot !== null;
  const [notices, payments, intents] = issued
    ? await Promise.all([
        listInvoiceNotifications(invoice.id),
        listInvoicePayments(invoice.id),
        listInvoicePaymentIntents(invoice.id),
      ])
    : [[], [], []];
  let preview: Awaited<ReturnType<typeof previewSavedInvoice>> | null = null;
  if (!issued) {
    try {
      preview = await previewSavedInvoice(invoice.id);
    } catch (error) {
      if (
        !(error instanceof BillingConfigurationError) &&
        !(error instanceof InvoiceQuoteMismatchError)
      )
        throw error;
    }
  }
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
      <h1 className="my-6 !text-[clamp(2rem,4vw,2.6rem)]">
        {issued ? `Invoice ${invoice.snapshot?.number}` : "Draft invoice"}
      </h1>
      {invoice.snapshot ? (
        <AdminIssuedInvoice
          invoice={invoice}
          snapshot={invoice.snapshot}
          familyName={family?.display_name ?? "Unnamed family"}
          notices={notices}
          payments={payments}
          intents={intents}
        />
      ) : (
        <AdminDraftInvoice invoice={invoice} preview={preview} />
      )}
    </PortalShell>
  );
}
export default function Page({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="section wrap">
          <p>Opening invoice…</p>
        </main>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}
