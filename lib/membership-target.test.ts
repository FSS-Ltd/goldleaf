import assert from "node:assert/strict";
import { test } from "node:test";
import { removeScopedMembership, type MembershipScope } from "./portal/membership-target";

const member = "10000000-0000-4000-8000-000000000001";
const family = "10000000-0000-4000-8000-000000000002";
const other = "10000000-0000-4000-8000-000000000003";
const parent: MembershipScope = { role: "parent", familyId: family, membershipId: member };

test("removal authorizes twice, checks the selected family, then revokes", async () => {
  const calls: string[] = [];
  const operations = {
    authorize: async () => { calls.push("authorize"); },
    parents: async (id: string) => { calls.push(id); return [{ id: member, email: "parent@example.invalid" }]; },
    staff: async () => { throw new Error("wrong list"); },
    revoke: async (id: string) => { calls.push(id); },
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
    staff: async () => [{ id: member, email: null }],
    revoke: async () => { revocations++; },
  };
  assert.equal(await removeScopedMembership({ role: "staff", membershipId: member }, "yes", operations), false);
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
    parents: async () => [{ id: member, email: "parent@example.invalid" }],
    staff: async () => [],
    revoke: async () => { revoked = true; },
  }));
  assert.equal(revoked, false);
});
