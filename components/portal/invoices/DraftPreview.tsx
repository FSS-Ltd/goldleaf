import type { z } from "zod";
import type { billingSettingsRowSchema } from "@/lib/portal/billing-settings-schema";
import type { previewInvoice } from "@/lib/portal/invoices";
import { pounds, quantityLabel, tierLabel, subcard } from "./format";

export function DraftPreview({
  quote,
  settings,
  recipientName,
  recipientAddress,
}: {
  quote: Awaited<ReturnType<typeof previewInvoice>> | null;
  settings: z.infer<typeof billingSettingsRowSchema>;
  recipientName: string;
  recipientAddress: string;
}) {
  return (
    <div className={subcard} aria-live="polite">
      <h3 className="!font-sans !text-xs font-semibold uppercase tracking-wide">
        Invoice preview
      </h3>
      <div className="mt-5 rounded-xl border border-[#e3d7c3] bg-white p-5">
        <h4 className="!text-xl">
          {(quote?.settings ?? settings).issuer_name}
        </h4>
        <p className="mt-1 whitespace-pre-line text-sm">
          {(quote?.settings ?? settings).issuer_address}
        </p>
        <p className="text-sm">
          {(quote?.settings ?? settings).issuer_contact}
        </p>
        <div className="mt-5 border-t border-[#e3d7c3] pt-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-[#5a6a5e]">
            Billed to
          </p>
          <p className="mt-2 font-medium">
            {recipientName || "Recipient name"}
          </p>
          <p className="whitespace-pre-line">
            {recipientAddress || "Recipient address"}
          </p>
        </div>
        {quote ? (
          <>
            <ul className="mt-5 divide-y divide-[#e3d7c3] border-y border-[#e3d7c3]">
              {quote.lines.map((line, index) => (
                <li key={index} className="py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{line.description}</span>
                    <span>
                      {pounds(line.unit_amount_pence * line.quantity)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5a6a5e]">
                    {line.service_date} · {quantityLabel(line.quantity, line.cadence, line.quantity_basis)} · {line.days} days/week
                  </p>
                  <p className="mt-1 text-xs text-[#5a6a5e]">
                    {tierLabel(line.rate_tier)} · {pounds(line.hourly_rate_pence)} per hour ·{" "}
                    {pounds(line.unit_amount_pence)} per{" "}
                    {line.cadence === "weekly" ? "week" : "month"}{line.quantity_basis === "children" ? " per child" : ""}
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
                <dd>{pounds(quote.netPence)}</dd>
              </div>
              {quote.settings.vat_enabled && (
                <div className="flex justify-between">
                  <dt>VAT</dt>
                  <dd>{pounds(quote.vatPence)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[#e3d7c3] pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{pounds(quote.totalPence)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-5 border-t border-[#e3d7c3] pt-4 text-sm text-[#5a6a5e]">
            Enter service details and select Preview quote.
          </p>
        )}
        {(quote?.settings ?? settings).payment_method && (
          <p className="mt-5 whitespace-pre-line rounded-lg bg-[#f6eee2] p-3 text-sm">
            <strong>Payment instructions: </strong>
            {(quote?.settings ?? settings).payment_method}
          </p>
        )}
      </div>
    </div>
  );
}
