import assert from "node:assert/strict";
import { test } from "node:test";
import { selectParentHomeData } from "./portal/parent-home-selection";

const children = [{ id: "child-1", display_name: "Robin" }];
const now = Date.parse("2027-01-01T12:00:00Z");
test("selects an active authorised session and latest authorised published update", () => {
  const sessions = [
    {
      id: "ended",
      child_id: "child-1",
      status: "completed",
      starts_at: "2027-01-01T10:00:00Z",
      duration_minutes: 120,
    },
    {
      id: "foreign",
      child_id: "other",
      status: "scheduled",
      starts_at: "2027-01-01T12:00:00Z",
      duration_minutes: 120,
    },
    {
      id: "next",
      child_id: "child-1",
      status: "in_progress",
      starts_at: "2027-01-01T11:00:00Z",
      duration_minutes: 120,
    },
    {
      id: "later",
      child_id: "child-1",
      status: "scheduled",
      starts_at: "2027-01-02T11:00:00Z",
      duration_minutes: 120,
    },
  ];
  const updates = [
    { child_id: "other", published_at: "2027-01-03T00:00:00Z" },
    { child_id: "child-1", published_at: "2027-01-02T00:00:00Z" },
  ];
  const result = selectParentHomeData(sessions, updates, children, now);
  assert.equal(result.next?.id, "next");
  assert.equal(result.latest?.child.id, "child-1");
  assert.equal(sessions[0].id, "ended");
});
test("empty and expired records remain empty", () => {
  const result = selectParentHomeData(
    [
      {
        id: "expired",
        child_id: "child-1",
        status: "scheduled",
        starts_at: "2027-01-01T09:00:00Z",
        duration_minutes: 120,
      },
    ],
    [],
    children,
    now,
  );
  assert.equal(result.next, undefined);
  assert.equal(result.latest, undefined);
});
