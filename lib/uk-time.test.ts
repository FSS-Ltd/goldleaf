import { test } from "node:test";
import assert from "node:assert/strict";
import { ukLocalToIso } from "./portal/uk-time";

test("UK local scheduling rejects clock changes and invalid dates", () => {
  assert.equal(ukLocalToIso("2026-01-10", "10:30"), "2026-01-10T10:30:00.000Z");
  assert.equal(ukLocalToIso("2026-07-10", "10:30"), "2026-07-10T09:30:00.000Z");
  for (const [date, time] of [["2026-03-29", "01:30"], ["2026-10-25", "01:30"], ["2026-02-30", "10:00"]]) {
    assert.throws(() => ukLocalToIso(date, time));
  }
});
