import assert from "node:assert/strict";
import { test } from "node:test";
import { staffInvitationSchema, staffAssignmentSchema } from "./portal/staff-schemas";

test("staff operations reject extra authority and malformed identifiers", () => {
  const staffId = "10000000-0000-4000-8000-000000000001";
  const familyId = "10000000-0000-4000-8000-000000000002";
  assert.equal(staffInvitationSchema.safeParse({ email: "person@example.com" }).success, true);
  assert.equal(staffInvitationSchema.safeParse({ email: "bad" }).success, false);
  assert.equal(staffInvitationSchema.safeParse({ email: "person@example.com", role: "admin" }).success, false);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId, enabled: true }).success, true);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId: "bad", enabled: true }).success, false);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId, enabled: true, subject: "other" }).success, false);
});
