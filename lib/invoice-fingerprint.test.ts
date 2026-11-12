import assert from "node:assert/strict";
import { test } from "node:test";
import { assertInvoiceFingerprint, invoiceFingerprint } from "./portal/invoice-fingerprint";

test("review fingerprint changes when draft, quote or settings context changes", () => {
 const reviewed = { draft: { recipient: "Parent" }, context: { rate: 25 }, quote: { amount: 5000 } };
 assert.equal(invoiceFingerprint(reviewed), invoiceFingerprint(reviewed));
 assert.notEqual(invoiceFingerprint(reviewed), invoiceFingerprint({ ...reviewed, context: { rate: 28 } }));
 assert.notEqual(invoiceFingerprint(reviewed), invoiceFingerprint({ ...reviewed, quote: { amount: 5500 } }));
 assert.notEqual(invoiceFingerprint(reviewed), invoiceFingerprint({ ...reviewed, draft: { recipient: "Other" } }));
 assert.doesNotThrow(() => assertInvoiceFingerprint(invoiceFingerprint(reviewed), reviewed));
 assert.throws(() => assertInvoiceFingerprint(invoiceFingerprint(reviewed), { ...reviewed, context: { rate: 28 } }), /context changed/);
});
