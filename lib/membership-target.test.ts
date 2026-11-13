import assert from "node:assert/strict";
import { test } from "node:test";
import { membershipScopeSchema, removeScopedMembership, type MembershipScope } from "./portal/membership-target";

const member = "10000000-0000-4000-8000-000000000001";
const family = "10000000-0000-4000-8000-000000000002";
const other = "10000000-0000-4000-8000-000000000003";
const parent: MembershipScope = { role: "parent", familyId: family, membershipId: member, generation: "0" };

test("removal authorizes twice, checks the selected family, then revokes", async () => {
  const calls: string[] = [];
  const operations = {
    authorize: async () => { calls.push("authorize"); },
    parents: async (id: string) => { calls.push(id); return [{ id: member, email: "parent@example.invalid", generation: "0" }]; },
    staff: async () => { throw new Error("wrong list"); },
    revoke: async (target: MembershipScope) => { calls.push(target.membershipId); return true; },
  };
  assert.equal(await removeScopedMembership(parent, "yes", operations), true);
  assert.deepEqual(calls, ["authorize", family, "authorize", member]);
  calls.length = 0;
  assert.equal(await removeScopedMembership({ ...parent, membershipId: other }, "yes", operations), false);
  assert.deepEqual(calls, ["authorize", family]);
  calls.length = 0;
  await assert.rejects(removeScopedMembership(parent, null, operations));
  assert.deepEqual(calls, ["authorize"]);
});

test("staff and uncertain retries never revoke an absent or unverified target", async () => {
  let revocations = 0;
  const operations = {
    authorize: async () => {},
    parents: async () => [],
    staff: async () => [{ id: member, email: null, generation: "0" }],
    revoke: async () => { revocations++; return true; },
  };
  assert.equal(await removeScopedMembership({ role: "staff", membershipId: member, generation: "0" }, "yes", operations), false);
  assert.equal(await removeScopedMembership(parent, "yes", operations), false);
  assert.equal(revocations, 0);
  await assert.rejects(removeScopedMembership(parent, "yes", { ...operations, authorize: async () => { throw new Error("session changed"); } }));
  assert.equal(revocations, 0);
});

test("a session change after selection prevents the mutation", async () => {
  let checks = 0;
  let revoked = false;
  await assert.rejects(removeScopedMembership(parent, "yes", {
    authorize: async () => { if (++checks === 2) throw new Error("session changed"); },
    parents: async () => [{ id: member, email: "parent@example.invalid", generation: "0" }],
    staff: async () => [],
    revoke: async () => { revoked = true; return true; },
  }));
  assert.equal(revoked, false);
});

test("generation is a canonical signed-bigint-safe decimal and an old generation cannot match", async () => {
  assert.equal(membershipScopeSchema.safeParse({ ...parent, generation: "9223372036854775807" }).success, true);
  for (const generation of ["01", "-1", "9223372036854775808", "x"]) {
    assert.equal(membershipScopeSchema.safeParse({ ...parent, generation }).success, false);
  }
  assert.equal(membershipScopeSchema.safeParse({ ...parent, role: "admin" }).success, false);
  let revoked = false;
  assert.equal(await removeScopedMembership(parent, "yes", {
    authorize: async () => {},
    parents: async () => [{ id: member, email: "parent@example.invalid", generation: "2" }],
    staff: async () => [],
    revoke: async () => { revoked = true; return true; },
  }), false);
  assert.equal(revoked, false);
});
