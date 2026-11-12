import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionCard } from "../components/portal/parent-home/OverviewCards";
import type { Child, Session } from "./portal/learning-schemas";

const child: Child = {
  id: "child-2",
  family_id: "family-2",
  display_name: "Robin",
};
const session: Session = {
  id: "session-2",
  child_id: child.id,
  family_id: child.family_id,
  starts_at: "2027-01-02T10:00:00Z",
  duration_minutes: 120,
  status: "scheduled",
  attendance: "not_recorded",
  location_label: "Library",
};
test("session actions target its actual session and family", () => {
  const html = renderToStaticMarkup(
    createElement(SessionCard, { session, child }),
  );
  assert.match(html, /href="\/parent\/sessions\/session-2"/);
  assert.match(
    html,
    /href="\/parent\/messages\?family=family-2#request-button-session-2"/,
  );
  assert.match(html, /Library/);
});

test("session heading reflects scheduled, active, and empty states", () => {
  const scheduled = renderToStaticMarkup(
    createElement(SessionCard, { session, child }),
  );
  const active = renderToStaticMarkup(
    createElement(SessionCard, {
      session: { ...session, status: "in_progress" },
      child,
    }),
  );
  const empty = renderToStaticMarkup(
    createElement(SessionCard, { session: undefined, child: undefined }),
  );
  assert.match(scheduled, /Your next session/);
  assert.match(active, /Your current session/);
  assert.doesNotMatch(active, /Your next session/);
  assert.match(empty, /No upcoming sessions scheduled/);
  assert.doesNotMatch(empty, /Your next session|Your current session/);
});
