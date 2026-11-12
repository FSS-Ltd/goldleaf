import assert from "node:assert/strict";
import { test } from "node:test";
import { verifiedIdentity } from "./portal/verified-identity";

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
