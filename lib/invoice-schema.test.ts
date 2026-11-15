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

test("admin invoice rows distinguish issued and draft data", async () => {
 const { adminInvoiceListRowSchema } = await import("./portal/invoice-schemas");
 const row = { id: draft.operationId, family_id: draft.familyId, family_name: "Family", recipient_name: "Parent", invoice_number: null, issue_date: null, due_date: null, total_pence: null, paid_pence: 0, is_issued: false };
 assert.equal(adminInvoiceListRowSchema.safeParse(row).success, true);
 assert.equal(adminInvoiceListRowSchema.safeParse({ ...row, is_issued: true }).success, false);
 assert.equal(adminInvoiceListRowSchema.safeParse({ ...row, is_issued: true, invoice_number: "1", issue_date: "2027-01-01", due_date: "2027-01-15", total_pence: 6000 }).success, true);
});

test("issued snapshot accepts legacy missing contact and retains new contact", async () => {
 const { issuedInvoiceRowSchema } = await import("./portal/invoice-schemas");
 const snapshot = { number: 1, issuer_name: "Goldleaf Learning Ltd", issuer_address: "51 Hurst rd", recipient_name: "Parent", recipient_address: "Address", issue_date: "2027-01-01", due_date: "2027-01-15", payment_terms_days: 14, payment_method: "Bank", billing_cadence: "weekly", founding_transition_date: null, vat_enabled: false, vat_rate_basis_points: null, vat_registration: null, currency: "GBP", lines: [{ description: "Tuition", quantity: 1, unit_amount_pence: 6000, service_date: "2027-01-01", rate_tier: "standard", hourly_rate_pence: 3000, days: 1, cadence: "weekly", session_minutes: 120, discount_percent: 0, net_pence: 6000, vat_pence: 0 }], net_pence: 6000, vat_pence: 0, total_pence: 6000 };
 const legacy = issuedInvoiceRowSchema.parse({ id: draft.operationId, snapshot, paid_pence: 0 });
 assert.equal(legacy.snapshot.lines[0].quantity_basis, undefined);
 const childSnapshot = { ...snapshot, lines: [{ ...snapshot.lines[0], quantity_basis: "children" }] };
 assert.equal(issuedInvoiceRowSchema.parse({ id: draft.operationId, snapshot: childSnapshot, paid_pence: 0 }).snapshot.lines[0].quantity_basis, "children");
 assert.equal(issuedInvoiceRowSchema.safeParse({ id: draft.operationId, snapshot: { ...snapshot, lines: [{ ...snapshot.lines[0], quantity_basis: "unknown" }] }, paid_pence: 0 }).success, false);
 const current = issuedInvoiceRowSchema.parse({ id: draft.operationId, snapshot: { ...snapshot, issuer_contact: "billing@example.com" }, paid_pence: 0 });
 assert.equal(current.snapshot.issuer_contact, "billing@example.com");
 const sessionLine = { ...snapshot.lines[0], pricing_basis: "session", hourly_rate_pence: null, session_fee_pence: 6000, session_minutes: 105 };
 assert.equal(issuedInvoiceRowSchema.safeParse({ id: draft.operationId, snapshot: { ...snapshot, lines: [sessionLine] }, paid_pence: 0 }).success, true);
 assert.equal(issuedInvoiceRowSchema.safeParse({ id: draft.operationId, snapshot: { ...snapshot, lines: [{ ...sessionLine, hourly_rate_pence: 3000 }] }, paid_pence: 0 }).success, false);
});

test("child-count intent is explicit while legacy request stays unchanged", () => {
 assert.deepEqual(draftInputSchema.parse(draft), draft);
 assert.deepEqual(draftInputSchema.parse({ ...draft, quantityIntent: "children-v1" }), { ...draft, quantityIntent: "children-v1" });
 assert.equal(draftInputSchema.safeParse({ ...draft, quantityIntent: "periods" }).success, false);
});

test("quantity labels preserve historical periods and show new child counts", async () => {
 const { quantityLabel } = await import("../components/portal/invoices/format");
 assert.equal(quantityLabel(2, "weekly"), "2 weeks");
 assert.equal(quantityLabel(1, "monthly", "periods"), "1 month");
 assert.equal(quantityLabel(1, "weekly", "children"), "1 child");
 assert.equal(quantityLabel(2, "monthly", "children"), "2 children");
});
