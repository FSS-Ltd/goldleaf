import assert from "node:assert/strict";
import { test } from "node:test";
import { clearPaymentStorage, paymentStoragePrefix } from "./portal/payment-storage";

function storage(initial: Record<string,string>) {
 const values = new Map(Object.entries(initial));
 return { get length() { return values.size; }, key(index: number) { return [...values.keys()][index] ?? null; }, getItem(key: string) { return values.get(key) ?? null; }, removeItem(key: string) { values.delete(key); }, values };
}

test("clears payment operations on sign-out or actor change without touching unrelated storage", () => {
 const key = `${paymentStoragePrefix}invoice`;
 const s = storage({ [key]: JSON.stringify({ userId: "user-1", sessionId: "session-1", payment: { reference: "private" } }), unrelated: "keep" });
 clearPaymentStorage(s, { userId: "user-1", sessionId: "session-1" });
 assert.equal(s.values.has(key), true);
 clearPaymentStorage(s, { userId: "user-2", sessionId: "session-2" });
 assert.equal(s.values.has(key), false);
 assert.equal(s.values.get("unrelated"), "keep");
 const signedOut = storage({ [key]: "bad data", unrelated: "keep" });
 clearPaymentStorage(signedOut);
 assert.equal(signedOut.values.has(key), false);
});

test("keeps retry data if provider sign-out fails", async () => {
 const { signOutAndClearPaymentStorage } = await import("./portal/payment-storage");
 const key = `${paymentStoragePrefix}invoice`; const s = storage({ [key]: "pending" });
 await assert.rejects(signOutAndClearPaymentStorage(async () => { throw new Error("unavailable"); }, s));
 assert.equal(s.values.has(key), true);
 await signOutAndClearPaymentStorage(async () => {}, s);
 assert.equal(s.values.has(key), false);
});
