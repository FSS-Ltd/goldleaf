import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteDraftLines, verifyInvoiceLines } from "./portal/invoice-quote";

const lines = [{ description: "Tuition", quantity: 1, days: 4, cadence: "weekly", serviceDate: "2027-04-01" }] as const;
const context = { settings: { founding_transition_date: "2027-04-01" }, eligibility: [{ service_date: "2027-04-01", is_founding: true }] };

test("quotes derive rates from eligibility and cutover", () => {
 const after = quoteDraftLines(lines, context);
 assert.equal(after[0].unit_amount_pence, 22400);
 assert.equal(after[0].rate_tier, "founding-post-intro");
 assert.equal(after[0].discount_percent, 0);
 const standard = quoteDraftLines(lines, { ...context, eligibility: [{ service_date: "2027-04-01", is_founding: false }] });
 assert.equal(standard[0].unit_amount_pence, 23000);
 assert.equal(standard[0].discount_percent, 5);
 assert.equal(quoteDraftLines(lines, { ...context, settings: { founding_transition_date: "2027-04-02" } })[0].unit_amount_pence, 20000);
 assert.throws(() => quoteDraftLines(lines, { ...context, eligibility: [{ service_date: "2027-04-01", is_founding: null }] }), /history/);
 assert.throws(() => quoteDraftLines(lines, { ...context, settings: { founding_transition_date: null } }), /transition/);
});

test("issue rejects changed stored price or quote metadata", () => {
 const quoted = quoteDraftLines(lines, context);
 assert.doesNotThrow(() => verifyInvoiceLines(quoted, context));
 for (const change of [{ unit_amount_pence: 1 }, { session_fee_pence: 1 }, { discount_percent: 5 }, { rate_tier: "standard" as const }]) {
   assert.throws(() => verifyInvoiceLines([{ ...quoted[0], ...change }], context), /quote/);
 }
 const legacy = { description: "Tuition", quantity: 1, unit_amount_pence: 22500, service_date: "2027-04-01", rate_tier: "founding-post-intro" as const, hourly_rate_pence: 2800, days: 4 as const, cadence: "weekly" as const, session_minutes: 120, discount_percent: 0 };
 assert.throws(() => verifyInvoiceLines([legacy], context), /quote/);
});

test("VAT rounds half pennies up per line and rejects excessive totals", async () => {
 const { calculateInvoiceTotals } = await import("./portal/invoice-quote");
 const priced = quoteDraftLines(lines, context)[0];
 assert.deepEqual(calculateInvoiceTotals([{ ...priced, unit_amount_pence: 3 }], { vat_enabled: true, vat_rate_basis_points: 5000 }), { netPence: 3, vatPence: 2, totalPence: 5 });
 assert.deepEqual(calculateInvoiceTotals([{ ...priced, unit_amount_pence: 1 }, { ...priced, unit_amount_pence: 1 }], { vat_enabled: true, vat_rate_basis_points: 5000 }), { netPence: 2, vatPence: 2, totalPence: 4 });
 assert.deepEqual(calculateInvoiceTotals([priced], { vat_enabled: false, vat_rate_basis_points: null }), { netPence: 22400, vatPence: 0, totalPence: 22400 });
 assert.throws(() => calculateInvoiceTotals([{ ...priced, quantity: 1000000 }], { vat_enabled: false, vat_rate_basis_points: null }), /exceeds/);
});

test("stale database context becomes a specific retryable error", async () => {
 const { translateInvoiceError, InvoiceContextChangedError } = await import("./portal/invoice-errors");
 assert.ok(translateInvoiceError({ code: "40001", message: "invoice context changed" }) instanceof InvoiceContextChangedError);
 const other = new Error("database unavailable");
 assert.equal(translateInvoiceError(other), other);
});

test("issuing requires configured payment and billing settings", async () => {
 const { validateIssuanceSettings } = await import("./portal/invoice-quote");
 const priced = quoteDraftLines(lines, context);
 const settings = { payment_terms_days: 14, payment_method: "Bank", billing_cadence: "weekly" as const, vat_enabled: false, vat_rate_basis_points: null, vat_registration: null };
 assert.doesNotThrow(() => validateIssuanceSettings(priced, settings));
 assert.throws(() => validateIssuanceSettings(priced, { ...settings, payment_method: null }), /settings/);
 assert.throws(() => validateIssuanceSettings(priced, { ...settings, billing_cadence: "monthly" }), /cadence/);
 assert.throws(() => validateIssuanceSettings(priced, { ...settings, vat_enabled: true }), /VAT/);
});

test("child-count quotes multiply the per-child price at tier boundaries", async () => {
 const { calculateInvoiceTotals } = await import("./portal/invoice-quote");
 for (const [date, founding, rate, total] of [["2027-04-04", true, 5000, 40000], ["2027-04-05", true, 5600, 44800], ["2027-04-06", true, 5600, 44800], ["2027-04-05", false, 6000, 46000]] as const) {
   const quote = quoteDraftLines([{ ...lines[0], quantity: 2, serviceDate: date }], { settings: { founding_transition_date: "2027-04-05" }, eligibility: [{ service_date: date, is_founding: founding }] }, "children");
   assert.equal(quote[0].quantity_basis, "children");
   assert.equal(quote[0].session_fee_pence, rate);
   assert.equal(calculateInvoiceTotals(quote, { vat_enabled: false, vat_rate_basis_points: null }).netPence, total);
 }
});
