import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftPreview } from "../components/portal/invoices/DraftPreview";
import { InvoiceDocument } from "../components/portal/invoices/InvoiceDocument";
import { issuedInvoiceRowSchema } from "./portal/invoice-schemas";

const longText = "LongInvoiceServiceDescription".repeat(8);
const settings = {
  singleton: true as const, issuer_name: longText, issuer_address: longText,
  issuer_contact: longText, vat_enabled: false, vat_rate_basis_points: null,
  vat_registration: null, payment_terms_days: 14, payment_method: longText,
  billing_cadence: "weekly" as const, founding_transition_date: null,
};
const line = {
  description: longText, quantity: 2, quantity_basis: "children" as const,
  unit_amount_pence: 11000, service_date: "2027-04-05",
  rate_tier: "founding-post-intro" as const, hourly_rate_pence: 2800,
  days: 2 as const, cadence: "weekly" as const, session_minutes: 120, discount_percent: 0,
};

test("invoice preview constrains long text and keeps the amount visible", () => {
  const quote = { settings, lines: [line], netPence: 22000, vatPence: 0, totalPence: 22000, fingerprint: "test" };
  const html = renderToStaticMarkup(createElement(DraftPreview, {
    settings, recipientName: longText, recipientAddress: longText, quote,
  }));
  assert.match(html, /\[overflow-wrap:anywhere\]/);
  assert.match(html, /class="min-w-0 flex-1 font-medium">LongInvoice/);
  assert.match(html, /class="shrink-0 whitespace-nowrap">£220\.00/);
  assert.ok(html.includes(longText));
});

test("issued and printed invoice text wraps inside a shrinkable line grid", () => {
  const snapshot = {
    number: 1, issuer_name: longText, issuer_address: longText, issuer_contact: longText,
    recipient_name: longText, recipient_address: longText, issue_date: "2027-04-05",
    due_date: "2027-04-19", payment_terms_days: 14, payment_method: longText,
    billing_cadence: "weekly", founding_transition_date: "2027-04-05", vat_enabled: false,
    vat_rate_basis_points: null, vat_registration: null, currency: "GBP",
    lines: [{ ...line, net_pence: 22000, vat_pence: 0 }], net_pence: 22000, vat_pence: 0, total_pence: 22000,
  };
  const invoice = issuedInvoiceRowSchema.parse({ id: "10000000-0000-4000-8000-000000000001", snapshot, paid_pence: 0 });
  const html = renderToStaticMarkup(createElement(InvoiceDocument, { invoice }));
  assert.match(html, /\[overflow-wrap:anywhere\]/);
  assert.match(html, /sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.ok(html.includes(longText));
  assert.ok(html.includes("£220.00"));
});
