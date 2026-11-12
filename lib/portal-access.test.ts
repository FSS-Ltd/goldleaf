import assert from "node:assert/strict";
import { test } from "node:test";
import { familyInputSchema, idResultSchema, invitationInputSchema, membershipSchema } from "./portal/schemas";

test("portal boundaries reject invalid input and unexpected database rows", () => {
  const familyId = "10000000-0000-4000-8000-000000000001";
  assert.equal(familyInputSchema.safeParse({ familyId, name: "Family", email: "person@example.com", founding: true }).success, true);
  assert.equal(familyInputSchema.safeParse({ familyId, name: " ", email: "person@example.com", founding: true }).success, false);
  assert.equal(familyInputSchema.safeParse({ familyId, name: "Family", email: "bad", founding: true }).success, false);
  assert.equal(familyInputSchema.safeParse({ familyId, name: "Family", email: "person@example.com", founding: true, role: "admin" }).success, false);
  assert.equal(invitationInputSchema.safeParse({ token: "short", purpose: "parent" }).success, false);
  assert.equal(invitationInputSchema.safeParse({ token: "a".repeat(43), purpose: "admin" }).success, false);
  assert.equal(membershipSchema.safeParse({ role: "parent", family_id: null }).success, false);
  assert.equal(membershipSchema.safeParse({ role: "admin", family_id: "10000000-0000-4000-8000-000000000001" }).success, false);
  assert.equal(idResultSchema.safeParse([]).success, false);
  assert.equal(idResultSchema.safeParse([{ id: "not-a-uuid" }]).success, false);
});
