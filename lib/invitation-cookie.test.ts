import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeInvitationCookie, parseInvitationCookie } from "./portal/invitation-cookie";

test("invitation cookie carries validated purpose and accepts older parent cookies", () => {
  const token = "a".repeat(43);
  assert.deepEqual(parseInvitationCookie(encodeInvitationCookie({ token, purpose: "staff" })), { token, purpose: "staff" });
  assert.deepEqual(parseInvitationCookie(encodeInvitationCookie({ token, purpose: "parent" })), { token, purpose: "parent" });
  assert.deepEqual(parseInvitationCookie(token), { token, purpose: "parent" });
  for (const value of [undefined, "staff:short", `admin:${token}`, `staff:${token}:extra`]) assert.equal(parseInvitationCookie(value), null);
});
