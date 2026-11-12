import assert from "node:assert/strict";
import { test } from "node:test";
import { childInput, draftInput, sessionChange, sessionInput, sessionRow, publishedRow } from "./portal/learning-schemas";
import { LearningConflictError, translateLearningError } from "./portal/learning-errors";

const id = "10000000-0000-4000-8000-000000000001";
test("learning inputs reject forged identities and invalid lifecycle data", () => {
  assert.equal(childInput.safeParse({ id, familyId: id, name: "Child", subject: "forged" }).success, false);
  assert.equal(sessionInput.safeParse({ id, childId: id, startsAt: "2026-12-01T10:00:00" }).success, false);
  assert.equal(sessionInput.parse({ id, childId: id, startsAt: "2026-12-01T10:00:00Z" }).locationLabel, null);
  assert.equal(sessionChange.safeParse({ sessionId: id, status: null, attendance: null }).success, false);
  assert.equal(draftInput.safeParse({ sessionId: id, body: "x", stage: 5, focus: null, practice: null, expectedVersion: 0 }).success, false);
});
test("Neon timestamp objects are validated and normalised", () => {
  const time = new Date("2026-12-01T10:00:00Z");
  assert.equal(sessionRow.parse({ id, child_id: id, family_id: id, starts_at: time, duration_minutes: 120, status: "scheduled", attendance: "not_recorded", location_label: null }).starts_at, time.toISOString());
  assert.equal(publishedRow.parse({ id, session_id: id, child_id: id, family_id: id, body: "x", stage: null, focus: null, practice: null, published_at: time, published_by: id }).published_at, time.toISOString());
});
test("only known stale-write errors become a reviewable conflict", () => {
  assert.ok(translateLearningError({ code: "40001", message: "draft changed" }) instanceof LearningConflictError);
  const other = { code: "40001", message: "other failure" };
  assert.equal(translateLearningError(other), other);
});
