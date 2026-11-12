import assert from "node:assert/strict";
import { test } from "node:test";
import { types } from "@neondatabase/serverless";
import { staffInvitationSchema, staffAssignmentSchema, staffAssignmentsSchema, pendingStaffInvitationSchema } from "./portal/staff-schemas";

test("staff operations reject extra authority and malformed identifiers", () => {
  const staffId = "10000000-0000-4000-8000-000000000001";
  const familyId = "10000000-0000-4000-8000-000000000002";
  assert.equal(staffInvitationSchema.safeParse({ email: "person@example.com" }).success, true);
  assert.equal(staffInvitationSchema.safeParse({ email: "bad" }).success, false);
  assert.equal(staffInvitationSchema.safeParse({ email: "person@example.com", role: "admin" }).success, false);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId, enabled: true }).success, true);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId: "bad", enabled: true }).success, false);
  assert.equal(staffAssignmentSchema.safeParse({ staffId, familyId, enabled: true, subject: "other" }).success, false);
  assert.equal(staffAssignmentsSchema.safeParse({ staffId, familyIds: [familyId] }).success, true);
  assert.equal(staffAssignmentsSchema.safeParse({ staffId, familyIds: ["bad"] }).success, false);
  assert.equal(staffAssignmentsSchema.safeParse({ staffId, familyIds: Array(501).fill(familyId) }).success, false);
  assert.equal(staffAssignmentsSchema.safeParse({ staffId, familyIds: [], subject: "other" }).success, false);
});

test("pending invitation rows normalize Neon timestamptz values", () => {
  const expires = types.getTypeParser(1184)("2026-11-12 10:30:00+00");
  assert.ok(expires instanceof Date);
  const row = pendingStaffInvitationSchema.parse({ id: "10000000-0000-4000-8000-000000000001", email: "staff@example.com", expires_at: expires });
  assert.equal(row.expires_at, "2026-11-12T10:30:00.000Z");
  assert.equal(pendingStaffInvitationSchema.safeParse({ ...row, expires_at: "not a date" }).success, false);
});
