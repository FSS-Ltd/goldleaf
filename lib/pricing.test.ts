import { test } from "node:test";
import assert from "node:assert/strict";
import { DAYS, monthly, weekly } from "./pricing";

// Expected values are the client's pricing table (business plan, page 5).
const table = {
  30: { weekly: [55, 105, 150, 190, 225], monthly: [238, 455, 650, 823, 975] },
  25: { weekly: [45, 90, 125, 160, 185], monthly: [195, 390, 542, 693, 802] },
} as const;

for (const rate of [30, 25] as const) {
  test(`pricing matches the client table at ${rate} pounds an hour`, () => {
    const w = DAYS.map((d) => weekly(rate, d));
    assert.deepEqual(w, [...table[rate].weekly]);
    assert.deepEqual(w.map(monthly), [...table[rate].monthly]);
  });
}
