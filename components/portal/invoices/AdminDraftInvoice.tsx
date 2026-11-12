import type {
  readAdminInvoice,
  previewSavedInvoice,
} from "@/lib/portal/invoices";
import { IssueForm } from "./InvoiceActions";
import { card, pounds, subcard } from "./format";
type AdminInvoice = NonNullable<Awaited<ReturnType<typeof readAdminInvoice>>>;
type Preview = Awaited<ReturnType<typeof previewSavedInvoice>> | null;
export function AdminDraftInvoice({
  invoice,
  preview,
}: {
  invoice: AdminInvoice;
  preview: Preview;
}) {
  return (
    <section className={card}>
      <h2 className="!text-xl">Saved draft</h2>
      <p className="mt-2 text-sm">
        {invoice.recipient_name} · {invoice.recipient_address}
      </p>
      {preview ? (
        <div className={`mt-5 ${subcard}`}>
          <h3 className="!font-sans !text-sm font-semibold">Current quote</h3>
          <p className="mt-3 text-sm">
            {preview.settings.issuer_name} · {preview.settings.issuer_address} ·{" "}
            {preview.settings.issuer_contact}
          </p>
          <ul className="mt-4 divide-y divide-[#e3d7c3]">
            {preview.lines.map((line, index) => (
              <li key={index} className="py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>
                    {line.description} · {line.service_date}
                  </span>
                  <span>{pounds(line.quantity * line.unit_amount_pence)}</span>
                </div>
                <p className="mt-1 text-xs text-[#5a6a5e]">
                  {line.quantity} {line.cadence === "weekly" ? "week" : "month"}
                  {line.quantity === 1 ? "" : "s"} · {line.days} days per week ·{" "}
                  {pounds(line.hourly_rate_pence)} per hour ·{" "}
                  {pounds(line.unit_amount_pence)} per period
                  {line.discount_percent
                    ? ` · ${line.discount_percent}% discount included`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{pounds(preview.netPence)}</dd>
            </div>
            {preview.settings.vat_enabled && (
              <div className="flex justify-between">
                <dt>VAT</dt>
                <dd>{pounds(preview.vatPence)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{pounds(preview.totalPence)}</dd>
            </div>
          </dl>
          <p className="mt-4 whitespace-pre-line text-sm">
            {preview.settings.payment_method}
          </p>
          <IssueForm invoiceId={invoice.id} fingerprint={preview.fingerprint} />
        </div>
      ) : (
        <div className="mt-5 text-sm">
          <p>
            This draft cannot be issued with the current billing settings or
            quote. Review the settings and create a new draft if the price has
            changed.
          </p>
          <ul className="mt-4 divide-y divide-[#e3d7c3]">
            {invoice.lines?.map((line, index) => (
              <li key={index} className="py-3">
                <p className="font-medium">
                  {line.description} · {line.service_date}
                </p>
                <p className="mt-1 text-[#5a6a5e]">
                  {line.quantity} {line.cadence === "weekly" ? "week" : "month"}
                  {line.quantity === 1 ? "" : "s"} · {line.days} days per week ·
                  saved amount {pounds(line.unit_amount_pence)} per period
                </p>
              </li>
            ))}
          </ul>
          <a
            className="mt-3 inline-block underline"
            href="/admin/billing-settings"
          >
            Review billing settings
          </a>
        </div>
      )}
    </section>
  );
}
