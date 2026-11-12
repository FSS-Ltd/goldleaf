import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionStatusLabel } from "./portal/session-status";

test("session lifecycle labels reflect recorded status", () => {
  assert.equal(sessionStatusLabel("scheduled"), "Not started");
  assert.equal(sessionStatusLabel("in_progress"), "In progress");
  assert.equal(sessionStatusLabel("completed"), "Completed");
  assert.equal(sessionStatusLabel("cancelled"), "Cancelled");
});
