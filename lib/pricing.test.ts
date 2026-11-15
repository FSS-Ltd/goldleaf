import { test } from "node:test";
import assert from "node:assert/strict";
import { DAYS, monthly, weekly } from "./pricing";

// Per-session fees. Standard takes 5% off at 4 days and 10% at 5; the founding rate takes no discounts.
const table = {
  60: { discounted: true, weekly: [60, 120, 180, 230, 270], monthly: [260, 520, 780, 997, 1170] },
  50: { discounted: false, weekly: [50, 100, 150, 200, 250], monthly: [217, 433, 650, 867, 1083] },
} as const;

for (const rate of [60, 50] as const) {
  test(`pricing matches the table at ${rate} pounds per session`, () => {
    const w = DAYS.map((d) => weekly(rate, d, table[rate].discounted));
    assert.deepEqual(w, [...table[rate].weekly]);
    assert.deepEqual(w.map(monthly), [...table[rate].monthly]);
  });
}

test("post-intro founding rate has no rounding", () => {
  assert.equal(weekly(56, 4, false), 224);
  assert.equal(monthly(224), 971);
});
