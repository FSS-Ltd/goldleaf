import type { IssuedInvoice } from "@/lib/portal/invoice-schemas";
import { invoicePaymentStatus } from "@/lib/portal/invoice-status";
import { invoiceDate, pounds, quantityLabel, tierLabel } from "./format";

export function InvoiceDocument({ invoice }: { invoice: IssuedInvoice }) {
  const s = invoice.snapshot;
  const status = invoicePaymentStatus(s.total_pence, invoice.paid_pence);
  const statusLabel =
    status === "partially-paid"
      ? "Partially paid"
      : status === "paid"
        ? "Paid"
        : "Unpaid";
  return (
    <article
      className="rounded-[14px] border border-[#e3d7c3] bg-white p-5 text-[#1b3022] shadow-sm sm:p-8 print:border-0 print:p-0 print:shadow-none"
      aria-label={`Invoice ${s.number}`}
    >
      <div className="flex flex-wrap justify-between gap-4 border-b border-[#e3d7c3] pb-6">
        <div>
          <h2 className="!text-2xl">{s.issuer_name}</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{s.issuer_address}</p>
          {s.issuer_contact && (
            <p className="mt-1 text-sm">{s.issuer_contact}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-medium">Invoice {s.number}</p>
          <p className="mt-1 text-sm">{statusLabel}</p>
        </div>
      </div>
      <div className="grid gap-5 border-b border-[#e3d7c3] py-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6a5e]">
            Billed to
          </p>
          <p className="mt-2 font-medium">{s.recipient_name}</p>
          <p className="whitespace-pre-line">{s.recipient_address}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-[#5a6a5e]">Issued</dt>
            <dd>{invoiceDate(s.issue_date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#5a6a5e]">Due</dt>
            <dd>{invoiceDate(s.due_date)}</dd>
          </div>
        </dl>
      </div>
      <div className="divide-y divide-[#e3d7c3]">
        {s.lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 py-5 text-sm sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-medium">{line.description}</p>
              <p className="mt-1 text-[#5a6a5e]">
                {invoiceDate(line.service_date)} · {quantityLabel(line.quantity, line.cadence, line.quantity_basis)} · {line.days}{" "}
                {line.days === 1 ? "day" : "days"} per week
              </p>
              <p className="mt-1 text-[#5a6a5e]">
                {line.quantity_basis === "children" ? `${tierLabel(line.rate_tier)} · ` : ""}{pounds(line.hourly_rate_pence)} per hour ·{" "}
                {pounds(line.unit_amount_pence)} per{" "}
                {line.cadence === "weekly" ? "week" : "month"}{line.quantity_basis === "children" ? " per child" : ""}
                {line.discount_percent > 0
                  ? ` · ${line.discount_percent}% discount included`
                  : ""}
              </p>
            </div>
            <p className="font-medium sm:text-right">
              {pounds(line.net_pence)}
            </p>
          </div>
        ))}
      </div>
      <dl className="ml-auto max-w-sm space-y-3 border-t border-[#e3d7c3] pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>{pounds(s.net_pence)}</dd>
        </div>
        {s.vat_enabled && (
          <>
            <div className="flex justify-between gap-4">
              <dt>VAT</dt>
              <dd>{pounds(s.vat_pence)}</dd>
            </div>
            <div className="text-xs text-[#5a6a5e]">
              VAT registration: {s.vat_registration}
            </div>
          </>
        )}
        <div className="flex justify-between gap-4 border-t border-[#e3d7c3] pt-3 font-semibold">
          <dt>Total</dt>
          <dd>{pounds(s.total_pence)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Paid</dt>
          <dd>{pounds(invoice.paid_pence)}</dd>
        </div>
        <div className="flex justify-between gap-4 rounded-lg bg-[#f6eee2] p-3 font-semibold">
          <dt>Outstanding</dt>
          <dd>{pounds(s.total_pence - invoice.paid_pence)}</dd>
        </div>
      </dl>
      <div className="mt-7 rounded-xl border border-[#e3d7c3] bg-[#fef8f3] p-4 text-sm print:bg-white">
        <h3 className="!font-sans !text-sm font-semibold">
          Payment instructions
        </h3>
        <p className="mt-2 whitespace-pre-line">{s.payment_method}</p>
      </div>
    </article>
  );
}
