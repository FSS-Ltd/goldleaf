import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoundingBand } from "../components/FoundingBand";
import { PricingTable } from "../components/PricingTable";

for (const [name, availability] of [["open", { total: 5, remaining: 3 }], ["full", { total: 5, remaining: 0 }], ["unknown", null]] as const) {
  test(`founding offer renders ${name} safely`, () => {
    const band = renderToStaticMarkup(createElement(FoundingBand, { availability }));
    const table = renderToStaticMarkup(createElement(PricingTable, { availability }));
    assert.equal(band.includes("3 of 5 founding places left"), name === "open");
    assert.equal(band.includes("Founding places are full"), name === "full");
    assert.equal(table.includes("£50 a session"), name === "open");
    assert.match(table, /£60 a session/);
    assert.doesNotMatch(table, /£5\.Monthly/);
    assert.match(table, /Monthly prices are averaged/);
    assert.equal(band.includes("Ask about a founding place"), name === "open");
  });
}
