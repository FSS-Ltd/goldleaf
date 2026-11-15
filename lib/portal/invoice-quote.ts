import { quoteInvoice } from "./invoice-pricing";
import type { DraftLine, PricedLine } from "./invoice-schemas";

type PricingContext = {
  settings: { founding_transition_date: string | null };
  eligibility: { service_date: string; is_founding: boolean | null }[];
};
export class BillingConfigurationError extends Error {}
export class InvoiceQuoteMismatchError extends Error {}

export type { PricedLine } from "./invoice-schemas";
type SessionPricedLine = Extract<PricedLine, { pricing_basis: "session" }>;

export function quoteDraftLines(lines: readonly DraftLine[], context: PricingContext, basis: "periods" | "children" = "periods"): SessionPricedLine[] {
  if (lines.length !== context.eligibility.length) throw new BillingConfigurationError("Eligibility context does not match service dates");
  return lines.map((line, index) => {
    const eligibility = context.eligibility[index];
    if (eligibility.service_date !== line.serviceDate) throw new BillingConfigurationError("Eligibility context does not match service dates");
    if (eligibility.is_founding === null) throw new BillingConfigurationError("Founding history requires reconciliation");
    if (eligibility.is_founding && !context.settings.founding_transition_date) throw new BillingConfigurationError("Founding transition date is required");
    const common = { days: line.days, cadence: line.cadence, serviceDate: line.serviceDate };
    const quote = eligibility.is_founding
      ? quoteInvoice({ ...common, tier: "founding", foundingTransitionDate: context.settings.founding_transition_date })
      : quoteInvoice({ ...common, tier: "standard" });
    if (BigInt(line.quantity) * BigInt(quote.amountPence) > BigInt(2147483647)) throw new BillingConfigurationError("Invoice line exceeds supported amount");
    return { description: line.description, quantity: line.quantity, ...(basis === "children" ? { quantity_basis: basis } : {}), unit_amount_pence: quote.amountPence,
      service_date: line.serviceDate, rate_tier: quote.tier, pricing_basis: "session" as const, hourly_rate_pence: null, session_fee_pence: quote.sessionFeePence,
      days: quote.days, cadence: quote.cadence, session_minutes: quote.sessionMinutes, discount_percent: quote.discountPercent };
  });
}

export function verifyInvoiceLines(lines: readonly PricedLine[], context: PricingContext): void {
  const inputs = lines.map((line) => ({ description: line.description, quantity: line.quantity, days: line.days, cadence: line.cadence, serviceDate: line.service_date }));
  const expected = quoteDraftLines(inputs, context);
  for (let i = 0; i < lines.length; i++) {
    const actual = lines[i];
    const quote = expected[i];
    if (actual.unit_amount_pence !== quote.unit_amount_pence || actual.pricing_basis !== "session" || actual.session_fee_pence !== quote.session_fee_pence ||
        actual.rate_tier !== quote.rate_tier || actual.discount_percent !== quote.discount_percent || actual.session_minutes !== quote.session_minutes) {
      throw new InvoiceQuoteMismatchError("Stored invoice line does not match the current quote");
    }
  }
}

export function calculateInvoiceTotals(lines: readonly PricedLine[], settings: { vat_enabled: boolean; vat_rate_basis_points: number | null }) {
  if (settings.vat_enabled && settings.vat_rate_basis_points === null) throw new BillingConfigurationError("VAT rate is required");
  let net = BigInt(0);
  let vat = BigInt(0);
  for (const line of lines) {
    const amount = BigInt(line.quantity) * BigInt(line.unit_amount_pence);
    net += amount;
    if (settings.vat_enabled) vat += (amount * BigInt(settings.vat_rate_basis_points ?? 0) + BigInt(5000)) / BigInt(10000);
  }
  const total = net + vat;
  if (total > BigInt(2147483647)) throw new BillingConfigurationError("Invoice total exceeds supported amount");
  return { netPence: Number(net), vatPence: Number(vat), totalPence: Number(total) };
}

export function validateIssuanceSettings(lines: readonly PricedLine[], settings: {
  payment_terms_days: number | null; payment_method: string | null; billing_cadence: "weekly" | "monthly" | null;
  vat_enabled: boolean; vat_rate_basis_points: number | null; vat_registration: string | null;
}): void {
  if (settings.payment_terms_days === null || settings.payment_method === null || settings.billing_cadence === null) {
    throw new BillingConfigurationError("Payment and billing settings are required before issue");
  }
  if (settings.vat_enabled && (settings.vat_rate_basis_points === null || settings.vat_registration === null)) {
    throw new BillingConfigurationError("VAT rate and registration are required before issue");
  }
  if (lines.some((line) => line.cadence !== settings.billing_cadence)) {
    throw new BillingConfigurationError("Invoice cadence does not match billing settings");
  }
}
