import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDecimalMinorUnits } from "./portal/decimal-input";

test("parses currency and percentage input exactly as minor units", () => {
  assert.equal(parseDecimalMinorUnits("0", 2147483647), 0);
  assert.equal(parseDecimalMinorUnits("12.3", 2147483647), 1230);
  assert.equal(parseDecimalMinorUnits("21474836.47", 2147483647), 2147483647);
  assert.equal(parseDecimalMinorUnits("20.00", 10000), 2000);
  for (const input of ["", "-1", "1.001", "1e2", "NaN", ".5", "21474836.48", "9".repeat(10000)]) {
    assert.throws(() => parseDecimalMinorUnits(input, 2147483647));
  }
  assert.throws(() => parseDecimalMinorUnits("100.01", 10000));
});
