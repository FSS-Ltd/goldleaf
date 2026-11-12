import assert from "node:assert/strict";
import { test } from "node:test";
import { staffProfile } from "./portal/staff-profile";

test("accepted staff identity uses the matching provider subject and verified email", () => {
  const staff = { id: "member", subject: "user-a" };
  const user = { id: "user-a", firstName: "Alex", lastName: "Example", primaryEmailAddressId: "primary", emailAddresses: [
    { id: "primary", emailAddress: "unverified@example.invalid", verification: { status: "unverified" } },
    { id: "other", emailAddress: "verified@example.invalid", verification: { status: "verified" } },
  ] };
  assert.deepEqual(staffProfile(staff, user), { id: "member", name: "Alex Example", email: "verified@example.invalid" });
  assert.deepEqual(staffProfile(staff, { ...user, id: "user-b" }), { id: "member", name: null, email: null });
  assert.deepEqual(staffProfile(staff, { ...user, emailAddresses: [user.emailAddresses[0]] }), { id: "member", name: "Alex Example", email: null });
});
