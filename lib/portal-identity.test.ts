import assert from "node:assert/strict";
import { test } from "node:test";
import { portalSessionState, verifiedIdentity } from "./portal/verified-identity";

test("only verified email addresses are returned with the stable subject", () => {
  const emailAddresses = [
    { emailAddress: "parent@example.invalid", verification: { status: "verified" } },
    { emailAddress: "other@example.invalid", verification: { status: "verified" } },
    { emailAddress: "unverified@example.invalid", verification: { status: "unverified" } },
    { emailAddress: "unknown@example.invalid", verification: null },
  ];
  assert.deepEqual(verifiedIdentity({ id: "user_123", emailAddresses }), {
    userId: "user_123", verifiedEmails: ["parent@example.invalid", "other@example.invalid"],
  });
  assert.equal(verifiedIdentity(null), null);
  assert.equal(verifiedIdentity({ id: "user_123", emailAddresses: emailAddresses.slice(2) }), null);
  assert.equal(verifiedIdentity({ id: "", emailAddresses }), null);
});


test("portal session distinguishes signed out, unverified, and verified accounts", () => {
  const verified = { id: "user_123", emailAddresses: [{ emailAddress: "parent@example.invalid", verification: { status: "verified" } }] };
  const unverified = { id: "user_123", emailAddresses: [{ emailAddress: "parent@example.invalid", verification: { status: "unverified" } }] };
  assert.deepEqual(portalSessionState(null, null), { status: "signed-out" });
  assert.deepEqual(portalSessionState("user_123", unverified), { status: "unverified" });
  assert.deepEqual(portalSessionState("user_123", null), { status: "unverified" });
  assert.deepEqual(portalSessionState("different-user", verified), { status: "unverified" });
  assert.deepEqual(portalSessionState("user_123", verified), { status: "verified", identity: { userId: "user_123", verifiedEmails: ["parent@example.invalid"] } });
});
