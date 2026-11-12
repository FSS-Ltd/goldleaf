import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePortalEvent } from "./portal/events-protocol";
test("accepts only bounded, generic portal event frames", () => {
  assert.equal(parsePortalEvent('data: {"type":"ready"}'), "ready");
  assert.equal(
    parsePortalEvent('data: {"type":"access_changed"}'),
    "access_changed",
  );
  for (const frame of [
    ": heartbeat",
    'data: {"type":"change","id":"private"}',
    "data: {bad}",
    'data: {"type":"ready"}\ndata: {"type":"change"}',
    "data: " + "x".repeat(300),
  ])
    assert.equal(parsePortalEvent(frame), null);
});
