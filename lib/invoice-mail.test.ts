import assert from "node:assert/strict";
import { test } from "node:test";
import { sendInvoiceMail } from "./portal/invoice-mail";

const input = { from: "Goldleaf <billing@example.com>", to: "parent@example.com", origin: "https://goldleaf.example", invoiceId: "10000000-0000-4000-8000-000000000001", familyId: "10000000-0000-4000-8000-000000000002", attemptId: "10000000-0000-4000-8000-000000000003", requireHttps: true };

test("notification sends only a protected link with a stable idempotency key", async () => {
 let message = ""; let key = "";
 const status = await sendInvoiceMail(async (payload, options) => { message = payload.text; key = options.idempotencyKey; return { data: { id: "provider-id" }, error: null }; }, input);
 assert.equal(status, "sent");
 assert.match(message, /https:\/\/goldleaf\.example\/parent\/billing\//);
 assert.equal(message.includes("Tuition"), false);
 assert.equal(key, `invoice/${input.attemptId}`);
});

test("errors and thrown network outcomes remain uncertain", async () => {
 assert.equal(await sendInvoiceMail(async () => ({ data: null, error: { message: "unavailable" } }), input), "uncertain");
 assert.equal(await sendInvoiceMail(async () => { throw new Error("timeout"); }, input), "uncertain");
 assert.equal(await sendInvoiceMail(async () => { throw new Error("should not send"); }, { ...input, origin: "http://insecure.example" }), "failed");
});
