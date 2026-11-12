import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentMatches } from "./portal/payment-retry";

test("reconciliation checks amount, date and reference before treating a retry as recorded", () => {
 const payment = { amountPence: 2500, paidOn: "2027-01-02", reference: "bank" };
 assert.equal(paymentMatches(payment, { amount_pence: 2500, paid_on: "2027-01-02", reference: "bank" }), true);
 assert.equal(paymentMatches(payment, { amount_pence: 2600, paid_on: "2027-01-02", reference: "bank" }), false);
 assert.equal(paymentMatches(payment, { amount_pence: 2500, paid_on: "2027-01-03", reference: "bank" }), false);
 assert.equal(paymentMatches(payment, null), false);
});
