import assert from "node:assert/strict";
import { test } from "node:test";
import { invoicePaymentStatus } from "./portal/invoice-status";

test("derives unpaid, partially paid and paid from integer balances", () => {
 assert.equal(invoicePaymentStatus(6000, 0), "unpaid");
 assert.equal(invoicePaymentStatus(6000, 2500), "partially-paid");
 assert.equal(invoicePaymentStatus(6000, 6000), "paid");
 assert.equal(invoicePaymentStatus(0, 0), "paid");
 assert.throws(() => invoicePaymentStatus(6000, 6001));
 assert.throws(() => invoicePaymentStatus(1.5, 0));
});
