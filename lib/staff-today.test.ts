import assert from "node:assert/strict";
import test from "node:test";
import { selectPrioritySession, selectTodaySessions, ukDayKey } from "./portal/staff-today";
import type { ScopedSession } from "./portal/sessions";

const session = (
  id: string,
  status: ScopedSession["status"],
  starts_at: string,
): ScopedSession => ({
  id,
  status,
  starts_at,
  child_id: "child",
  family_id: "family",
  child_name: "Child",
  family_name: "Family",
  duration_minutes: 120,
  attendance: "not_recorded",
  location_label: null,
});
const now = new Date("2026-11-11T12:00:00Z");

test("priority favours in-progress, then the next scheduled session", () => {
  const past = session("past", "scheduled", "2026-11-11T09:00:00Z");
  const next = session("next", "scheduled", "2026-11-11T13:00:00Z");
  const active = session("active", "in_progress", "2026-11-11T10:00:00Z");
  assert.equal(selectPrioritySession([past, next, active], now)?.id, "active");
  assert.equal(selectPrioritySession([past, next], now)?.id, "next");
  assert.equal(selectPrioritySession([past], now)?.id, "past");
});

test("completed and cancelled sessions are never the priority", () => {
  assert.equal(
    selectPrioritySession(
      [
        session("done", "completed", "2026-11-11T09:00:00Z"),
        session("cancelled", "cancelled", "2026-11-11T13:00:00Z"),
      ],
      now,
    ),
    undefined,
  );
});


test("today selection follows London dates across daylight saving changes", () => {
  assert.equal(ukDayKey(new Date("2026-03-29T23:30:00Z")), "2026-03-30");
  assert.equal(ukDayKey(new Date("2026-10-25T23:30:00Z")), "2026-10-25");
  const sessions = [session("before", "scheduled", "2026-03-28T23:59:00Z"), session("inside", "scheduled", "2026-03-29T22:59:00Z"), session("after", "scheduled", "2026-03-29T23:00:00Z")];
  assert.deepEqual(selectTodaySessions(sessions, new Date("2026-03-29T12:00:00Z")).map((item) => item.id), ["inside"]);
});

test("shared session cards target the fixed portal role", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { StaffSessionCard } = await import("../components/portal/staff-today/StaffSessionCard");
  const item = session("session-1", "scheduled", "2026-11-11T13:00:00Z");
  const admin = renderToStaticMarkup(createElement(StaffSessionCard, { session: item, priority: true, role: "admin" }));
  const staff = renderToStaticMarkup(createElement(StaffSessionCard, { session: item, priority: true }));
  assert.match(admin, /href="\/admin\/sessions\/session-1"/);
  assert.match(staff, /href="\/staff\/sessions\/session-1"/);
});
