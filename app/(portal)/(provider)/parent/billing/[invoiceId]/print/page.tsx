import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { InvoiceDocument } from "@/components/portal/invoices/InvoiceDocument";
import { PrintButton } from "@/components/portal/invoices/PrintButton";
import { readFamilyInvoice } from "@/lib/portal/invoices";
import { requireRole } from "@/lib/portal/require-role";
async function Print({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ family?: string }>;
}) {
  await requireRole("parent");
  const [p, query] = await Promise.all([params, searchParams]);
  const invoiceId = z.string().uuid().safeParse(p.invoiceId);
  const family = z.string().uuid().safeParse(query.family);
  if (!invoiceId.success || !family.success) notFound();
  const invoice = await readFamilyInvoice(family.data, invoiceId.data);
  if (!invoice) notFound();
  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8 print:p-0">
      <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
        <a
          className="text-sm underline"
          href={`/parent/billing/${invoice.id}?family=${family.data}`}
        >
          Back to invoice
        </a>
        <PrintButton />
      </div>
      <InvoiceDocument invoice={invoice} />
    </main>
  );
}
export const metadata = { title: "Printable invoice" };

export default function Page(props: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ family?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening invoice…" variant="detail" />
      }
    >
      <Print {...props} />
    </Suspense>
  );
}
