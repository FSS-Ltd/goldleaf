import assert from "node:assert/strict";
import { test } from "node:test";
import { authDestination } from "./portal/auth-destination";

test("authentication returns only to the portal or invitation acceptance", () => {
  assert.equal(authDestination("/invite/accept"), "/invite/accept");
  for (const value of [undefined, "/admin", "//example.com", "https://example.com", "/invite/accept?next=//example.com"]) {
    assert.equal(authDestination(value), "/portal");
  }
});
