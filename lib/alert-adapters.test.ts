import assert from "node:assert/strict";
import { test } from "node:test";
import { clerkIdentity, resendSubmit } from "./portal/alerts/adapters";
import { createPayload } from "./portal/alerts/model";

const signal = new AbortController().signal;
const user = (id: string, email_addresses: unknown[]) => ({ id, email_addresses });
const email = (email_address: string, status: string | null) => ({
  email_address, verification: status === null ? null : { status },
});

test("Clerk rejects invalid subjects before fetch", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected fetch"); });
  for (const subject of ["", "../user", "user/name", "user?x=1", "user%2Fname", "user name"]) {
    assert.equal(await clerkIdentity("secret")(subject, signal), null);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Clerk uses the fixed endpoint, bearer token and supplied signal", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json(user("user_123-A", [email("parent@example.test", "verified")])));
  assert.deepEqual(await clerkIdentity("test-key")("user_123-A", signal), ["parent@example.test"]);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ["https://api.clerk.com/v1/users/user_123-A", { headers: { Authorization: "Bearer test-key" }, signal }]);
});

test("Clerk handles missing, failed, malformed and mismatched identities", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  const lookup = clerkIdentity("test-key");
  assert.equal(await lookup("user_123", signal), null);
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await assert.rejects(lookup("user_123", signal), /Identity provider unavailable/);
  fetchMock.mock.mockImplementation(async () => new Response("not json"));
  await assert.rejects(lookup("user_123", signal));
  fetchMock.mock.mockImplementation(async () => Response.json({ id: "user_123", email_addresses: "invalid" }));
  await assert.rejects(lookup("user_123", signal));
  fetchMock.mock.mockImplementation(async () => Response.json(user("another_user", [email("parent@example.test", "verified")])));
  assert.equal(await lookup("user_123", signal), null);
  fetchMock.mock.mockImplementation(async () => Response.json(user("user_123", [email("parent@example.test", "unverified")])));
  assert.equal(await lookup("user_123", signal), null);
  fetchMock.mock.mockImplementation(async () => { throw new Error("network failure"); });
  await assert.rejects(lookup("user_123", signal), /network failure/);
});

test("Clerk follows canonical verified identity filtering without changing addresses", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(user("user_123", [
    email(" Parent@Example.test ", "verified"), email("parent@example.test", "verified"),
    email("parent@example.test", "verified"), email("", "verified"),
    email("other@example.test", "unverified"), email("unknown@example.test", null),
  ])));
  assert.deepEqual(await clerkIdentity("test-key")("user_123", signal), [" Parent@Example.test ", "parent@example.test", "parent@example.test"]);
});

test("Clerk returns all verified addresses without an adapter cap", async (t) => {
  const addresses = Array.from({ length: 101 }, (_, index) => `parent${index}@example.test`);
  t.mock.method(globalThis, "fetch", async () => Response.json(user("user_123", addresses.map((address) => email(address, "verified")))));
  assert.deepEqual(await clerkIdentity("test-key")("user_123", signal), addresses);
});

test("Resend submits the generic payload with idempotency key and signal", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ id: "accepted" }, { status: 202 }));
  const payload = createPayload("Goldleaf <updates@example.test>", "parent@example.test", "https://portal.example.test");
  assert.equal(await resendSubmit("test-key")(payload, "portal-alert/test", signal), "sent");
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ["https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer test-key", "Content-Type": "application/json", "Idempotency-Key": "portal-alert/test" },
    body: JSON.stringify({ from: "Goldleaf <updates@example.test>", to: "parent@example.test", subject: "You have a Goldleaf update", text: "There is an update in your Goldleaf portal. Sign in to view it:\n\nhttps://portal.example.test/portal" }), signal,
  }]);
});

test("Resend retries HTTP failure and propagates transport and abort failures", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  const submit = resendSubmit("test-key");
  const payload = createPayload("sender@example.test", "parent@example.test", "https://portal.example.test");
  assert.equal(await submit(payload, "key", signal), "retry");
  fetchMock.mock.mockImplementation(async () => { throw new Error("network failure"); });
  await assert.rejects(submit(payload, "key", signal), /network failure/);
  fetchMock.mock.mockImplementation(async () => { throw new DOMException("aborted", "AbortError"); });
  const aborted = AbortSignal.abort();
  await assert.rejects(submit(payload, "key", aborted), { name: "AbortError" });
  assert.equal(fetchMock.mock.calls[2].arguments[1]?.signal, aborted);
});
