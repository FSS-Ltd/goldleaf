import assert from "node:assert/strict";
import { test } from "node:test";
import { portalRoleLinks } from "./portal/role-links";
import { invitationDestination, parseInvitationCookie } from "./portal/invitation-cookie";

test("multi-role memberships expose each authorised portal once", () => {
  assert.deepEqual(portalRoleLinks(["parent", "staff", "parent"]).map((link) => link.href), ["/parent", "/staff"]);
  assert.deepEqual(portalRoleLinks(["admin", "staff"]).map((link) => link.href), ["/admin/today", "/staff"]);
  assert.deepEqual(portalRoleLinks(["staff", "parent", "admin"]).map((link) => link.href), ["/admin/today", "/parent", "/staff"]);
  assert.deepEqual(portalRoleLinks(["parent"]), []);
  assert.deepEqual(portalRoleLinks([]), []);
});

test("accepted invitations open the matching portal, including legacy parent cookies", () => {
  assert.equal(invitationDestination("staff"), "/staff");
  assert.equal(invitationDestination("parent"), "/parent");
  assert.equal(parseInvitationCookie("a".repeat(43))?.purpose, "parent");
});
