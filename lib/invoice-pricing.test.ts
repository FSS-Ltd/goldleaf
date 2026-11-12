import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteInvoice } from "./portal/invoice-pricing";

const cases = [
  { tier: "standard", weekly: [60, 120, 180, 230, 270], monthly: [260, 520, 780, 997, 1170] },
  { tier: "founding", weekly: [50, 100, 150, 200, 250], monthly: [217, 433, 650, 867, 1083] },
] as const;

test("quotes match every published single-child price", () => {
  for (const row of cases) {
    for (const days of [1, 2, 3, 4, 5] as const) {
      for (const cadence of ["weekly", "monthly"] as const) {
        const quote = quoteInvoice({ tier: row.tier, days, cadence, serviceDate: "2027-01-01", ...(row.tier === "founding" ? { foundingTransitionDate: "2027-04-01" } : {}) });
        assert.equal(quote.amountPence, row[cadence][days - 1] * 100);
        assert.equal(quote.hourlyRatePence, row.tier === "standard" ? 3000 : 2500);
        assert.equal(quote.discountPercent, row.tier === "standard" ? [0, 0, 0, 5, 10][days - 1] : 0);
        assert.equal(quote.sessionMinutes, 120);
        assert.equal(quote.currency, "GBP");
        assert.equal(quote.days, days);
        assert.equal(quote.cadence, cadence);
      }
    }
  }
});

test("founding rate changes on the confirmed transition date", () => {
  const input = { tier: "founding", days: 4, cadence: "weekly", foundingTransitionDate: "2027-04-01" } as const;
  assert.equal(quoteInvoice({ ...input, serviceDate: "2027-03-31" }).hourlyRatePence, 2500);
  const quote = quoteInvoice({ ...input, serviceDate: "2027-04-01" });
  assert.equal(quote.tier, "founding-post-intro");
  assert.equal(quote.hourlyRatePence, 2800);
  assert.equal(quote.discountPercent, 0);
  assert.equal(quote.amountPence, 22500);
  assert.equal(quoteInvoice({ ...input, cadence: "monthly", serviceDate: "2027-04-02" }).amountPence, 97500);
});

test("rejects invalid dates and incomplete or malformed inputs", () => {
  const valid = { tier: "founding", days: 1, cadence: "weekly", serviceDate: "2027-01-01", foundingTransitionDate: "2027-04-01" };
  for (const input of [
    { ...valid, serviceDate: "2027-02-30" }, { ...valid, serviceDate: "2027-1-01" },
    { ...valid, foundingTransitionDate: undefined }, { ...valid, foundingTransitionDate: "2027-13-01" },
    { ...valid, days: 0 }, { ...valid, days: 1.5 }, { ...valid, cadence: undefined },
    { ...valid, tier: "unknown" }, { ...valid, extra: true },
  ]) assert.throws(() => quoteInvoice(input));
});
