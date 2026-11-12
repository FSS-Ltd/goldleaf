import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { listParentInvoices, readFamilyInvoice } from "@/lib/portal/invoices";
import { invoicePaymentStatus } from "@/lib/portal/invoice-status";
import { requireRole } from "@/lib/portal/require-role";
import { InvoiceDocument } from "./InvoiceDocument";
import { card, invoiceDate, pounds, secondary } from "./format";

export async function ParentBilling({
  selected,
  family,
}: {
  selected?: string;
  family?: string;
}) {
  const { identity, memberships } = await requireRole("parent");
  const invoices = await listParentInvoices();
  let detail: Awaited<ReturnType<typeof readFamilyInvoice>> = null;
  if (selected !== undefined) {
    const invoiceId = z.string().uuid().safeParse(selected);
    const familyId = z.string().uuid().safeParse(family);
    if (
      !invoiceId.success ||
      !familyId.success ||
      !invoices.some(
        (invoice) =>
          invoice.id === invoiceId.data && invoice.family_id === familyId.data,
      )
    )
      notFound();
    detail = await readFamilyInvoice(familyId.data, invoiceId.data);
    if (!detail) notFound();
  }
  return (
    <PortalShell
      role="parent"
      userId={identity.userId}
      memberships={memberships}
      section="billing"
    >
      <div className="mb-8 border-b border-[#e3d7c3] pb-6">
        <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Your invoices</h1>
        <p className="mt-2 text-sm text-[#35594a]">
          View invoices issued to your family.
        </p>
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={card} aria-labelledby="parent-invoice-list">
          <h2 id="parent-invoice-list" className="!text-2xl">
            Invoices
          </h2>
          {invoices.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#d7c9b4] bg-white p-8 text-center">
              <p className="font-medium">No invoices issued yet</p>
              <p className="mt-2 text-sm text-[#35594a]">
                Invoices will appear here once they are issued.
              </p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-[#e3d7c3]">
              {invoices.map((invoice) => {
                const s = invoice.snapshot;
                const status = invoicePaymentStatus(
                  s.total_pence,
                  invoice.paid_pence,
                );
                return (
                  <li key={invoice.id} className="py-3">
                    <a
                      href={`/parent/billing/${invoice.id}?family=${invoice.family_id}`}
                      aria-current={
                        selected === invoice.id ? "page" : undefined
                      }
                      className="block rounded-lg bg-white p-4 hover:bg-[#fffbf6] focus-visible:outline-2 focus-visible:outline-[#06451d]"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-semibold">
                          Invoice {s.number}
                          {invoice.family_name
                            ? ` · ${invoice.family_name}`
                            : ""}
                        </span>
                        <span className="font-semibold">
                          {pounds(s.total_pence)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#35594a]">
                        Issued {invoiceDate(s.issue_date)} · Due{" "}
                        {invoiceDate(s.due_date)}
                      </p>
                      <p className="mt-1 text-xs text-[#35594a]">
                        {status === "partially-paid"
                          ? "Partially paid"
                          : status === "paid"
                            ? "Paid"
                            : "Unpaid"}{" "}
                        · {pounds(s.total_pence - invoice.paid_pence)}{" "}
                        outstanding
                      </p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {detail && (
          <section>
            <div
              className={`${card} mb-4 flex flex-wrap items-center justify-between gap-3`}
            >
              <div>
                <h2 className="!font-sans !text-base font-semibold">
                  Invoice detail
                </h2>
                <Link
                  href="/parent/billing"
                  className="mt-1 inline-block text-sm underline"
                >
                  Back to invoices
                </Link>
              </div>
              <a
                className={secondary}
                href={`/parent/billing/${detail.id}/print?family=${family}`}
              >
                Print invoice
              </a>
            </div>
            <InvoiceDocument invoice={detail} />
          </section>
        )}
      </div>
    </PortalShell>
  );
}
