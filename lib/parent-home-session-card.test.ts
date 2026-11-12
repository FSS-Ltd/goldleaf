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
