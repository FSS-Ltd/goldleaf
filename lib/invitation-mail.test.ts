import assert from "node:assert/strict";
import { test } from "node:test";
import { sendInvitationMail, type InvitationMessage } from "./portal/invitation-mail";

test("invitation mail uses a fragment and a stubbed sender", async () => {
  let captured: InvitationMessage | undefined;
  const token = "a".repeat(43);
  const result = await sendInvitationMail(async (message) => { captured = message; return { error: null, data: { id: "message_123" } }; }, {
    from: "sender@example.com", to: "parent@example.com", origin: "https://example.com", token, requireHttps: true,
  });
  assert.equal(result, "sent");
  assert.ok(captured);
  const link = captured.text.match(/https:\/\/\S+/);
  assert.ok(link);
  const url = new URL(link[0]);
  assert.equal(url.pathname, "/invite");
  assert.equal(url.search, "");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("token"), token);
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("purpose"), "parent");
});

test("invitation mail reports provider failure and rejects insecure production origins", async () => {
  const input = { from: "sender@example.com", to: "parent@example.com", origin: "https://example.com", token: "a".repeat(43), requireHttps: true };
  assert.equal(await sendInvitationMail(async () => ({ error: "failure", data: null }), input), "failed");
  assert.equal(await sendInvitationMail(async () => { throw new Error("provider"); }, input), "failed");
  assert.equal(await sendInvitationMail(async () => ({ error: null, data: null }), input), "failed");
  let called = false;
  assert.equal(await sendInvitationMail(async () => { called = true; return { error: null, data: { id: "message_123" } }; }, { ...input, origin: "http://example.com" }), "failed");
  assert.equal(called, false);
});

test("staff invitations retain their purpose in the protected link fragment", async () => {
  let captured: InvitationMessage | undefined;
  const token = "b".repeat(43);
  const result = await sendInvitationMail(async (message) => { captured = message; return { error: null, data: { id: "message_123" } }; }, {
    from: "sender@example.com", to: "staff@example.com", origin: "https://example.com", token, requireHttps: true, purpose: "staff",
  });
  assert.equal(result, "sent");
  assert.ok(captured);
  const link = captured.text.match(/https:\/\/\S+/);
  assert.ok(link);
  assert.equal(new URLSearchParams(new URL(link[0]).hash.slice(1)).get("purpose"), "staff");
});
