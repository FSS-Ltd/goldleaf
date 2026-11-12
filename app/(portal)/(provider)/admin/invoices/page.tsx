import { PortalLoading } from "@/components/portal/loading/PortalLoading";
import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  button,
  card,
  invoiceDate,
  pounds,
} from "@/components/portal/invoices/format";
import { readBillingSettings } from "@/lib/portal/billing-settings";
import { listAdminInvoices } from "@/lib/portal/invoices";
import { invoicePaymentStatus } from "@/lib/portal/invoice-status";
import { requireRole } from "@/lib/portal/require-role";

async function AdminInvoices() {
  const { identity, memberships } = await requireRole("admin");
  const [settings, invoices] = await Promise.all([
    readBillingSettings(),
    listAdminInvoices(),
  ]);
  return (
    <PortalShell
      role="admin"
      userId={identity.userId}
      memberships={memberships}
      section="invoices"
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="!text-[clamp(2rem,4vw,2.6rem)]">
              Billing & invoices
            </h1>
            <p className="mt-2 text-sm text-[#35594a]">
              Manage billing settings and invoices for your families.
            </p>
          </div>
          <Link className={button} href="/admin/invoices/new">
            Create invoice
          </Link>
        </div>
        <section className={card} aria-labelledby="billing-setup">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="billing-setup" className="!text-lg">
                Billing setup
              </h2>
              <p className="mt-1 text-sm text-[#35594a]">
                Cadence: {settings.billing_cadence ?? "Not set"} · VAT{" "}
                {settings.vat_enabled ? "enabled" : "disabled"} · Payment
                details{" "}
                {settings.payment_terms_days !== null && settings.payment_method
                  ? "configured"
                  : "not set"}
              </p>
            </div>
            <Link
              href="/admin/billing-settings"
              className="text-sm font-medium underline"
            >
              Billing settings
            </Link>
          </div>
        </section>
        <section className={card} aria-labelledby="invoice-list">
          <h2 id="invoice-list" className="!text-2xl">
            Invoices
          </h2>
          {invoices.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#d7c9b4] bg-white p-8 text-center">
              <p className="font-medium">No invoices yet</p>
              <p className="mt-2 text-sm text-[#35594a]">
                Create a draft when you are ready.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[#e3d7c3]">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="py-4">
                  <a
                    href={`/admin/invoices/${invoice.id}`}
                    className="block rounded-lg p-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#06451d]"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">
                        {invoice.is_issued
                          ? `Invoice ${invoice.invoice_number}`
                          : "Draft invoice"}{" "}
                        · {invoice.family_name ?? "Family"}
                      </span>
                      <span className="text-sm">
                        {invoice.is_issued
                          ? pounds(invoice.total_pence)
                          : "Draft"}
                      </span>
                    </div>
                    {invoice.is_issued && (
                      <p className="mt-1 text-xs text-[#35594a]">
                        Issued {invoiceDate(invoice.issue_date)} · Due{" "}
                        {invoiceDate(invoice.due_date)} ·{" "}
                        {invoicePaymentStatus(
                          invoice.total_pence,
                          invoice.paid_pence,
                        ) === "partially-paid"
                          ? "Partially paid"
                          : invoicePaymentStatus(
                                invoice.total_pence,
                                invoice.paid_pence,
                              ) === "paid"
                            ? "Paid"
                            : "Unpaid"}{" "}
                        · {pounds(invoice.total_pence - invoice.paid_pence)}{" "}
                        outstanding
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
export const metadata = { title: "Invoices" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <PortalLoading label="Opening invoices…" variant="list" />
      }
    >
      <AdminInvoices />
    </Suspense>
  );
}
