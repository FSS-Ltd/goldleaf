import assert from "node:assert/strict";
import { test } from "node:test";
import { draftInputSchema, paymentInputSchema } from "./portal/invoice-schemas";

const line = { description: "Tuition", quantity: 1, days: 4, cadence: "weekly", serviceDate: "2027-04-01" };
const draft = { operationId: "10000000-0000-4000-8000-000000000001", familyId: "10000000-0000-4000-8000-000000000002", recipientName: "Parent", recipientAddress: "Address", lines: [line] };

test("draft boundary accepts only explicit service inputs", () => {
  assert.deepEqual(draftInputSchema.parse(draft), draft);
  for (const input of [
    { ...draft, lines: [] }, { ...draft, lines: [{ ...line, quantity: 1.5 }] },
    { ...draft, lines: [{ ...line, quantity: 0 }] }, { ...draft, lines: [{ ...line, serviceDate: "2027-02-30" }] },
    { ...draft, lines: [{ ...line, hourlyRatePence: 1 }] }, { ...draft, tier: "founding" },
    { ...draft, recipientName: " " }, { ...draft, operationId: "bad" },
  ]) assert.equal(draftInputSchema.safeParse(input).success, false);
});

test("payment inputs require positive integer pence and a stable operation ID", () => {
  const payment = { invoiceId: draft.familyId, operationId: draft.operationId, amountPence: 6000, paidOn: "2027-04-02", reference: "bank-ref" };
  assert.deepEqual(paymentInputSchema.parse(payment), payment);
  for (const input of [{ ...payment, amountPence: 0 }, { ...payment, amountPence: 1.5 }, { ...payment, amountPence: 2147483648 }, { ...payment, paidOn: "2027-02-30" }, { ...payment, subject: "admin" }]) {
    assert.equal(paymentInputSchema.safeParse(input).success, false);
  }
});

test("issue context retains database fields for the optimistic comparison", async () => {
  const { issueContextSchema } = await import("./portal/invoice-schemas");
  const context = {
    invoice_id: draft.familyId, invoice_number: null, recipient_name: "Parent", recipient_address: "Address",
    pricing: { family_id: draft.familyId, settings: { founding_transition_date: null, vat_enabled: false, vat_rate_basis_points: null, vat_registration: null, payment_terms_days: 14, payment_method: "Bank", billing_cadence: "weekly" }, slot_assigned: false, history: [], eligibility: [{ service_date: line.serviceDate, is_founding: false }] },
    lines: [{ id: "9007199254740993", invoice_id: draft.familyId, description: " Tuition ", quantity: 1, unit_amount_pence: 23000, service_date: line.serviceDate, rate_tier: "standard", hourly_rate_pence: 3000, days: 4, cadence: "weekly", session_minutes: 120, discount_percent: 5 }],
  };
  assert.deepEqual(issueContextSchema.parse(context), context);
});
