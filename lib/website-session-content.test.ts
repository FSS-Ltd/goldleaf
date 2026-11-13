import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sessionBlocks } from "../content/session";
import { faqs } from "../content/faq";
import { sessionTimeLabel, site } from "../content/site";
import { PricingTable } from "../components/PricingTable";
import { organisationSchema } from "./schema-org";

test("client timetable and public facts stay consistent", () => {
  assert.equal(site.sessionMinutes, 105);
  assert.equal(sessionTimeLabel, "1:00pm–2:45pm");
  assert.deepEqual(sessionBlocks.map(({ time }) => time), [
    "1:00 to 1:05", "1:05 to 1:10", "1:10 to 1:20", "1:20 to 1:30",
    "1:30 to 1:40", "1:40 to 1:50", "1:50 to 2:00", "2:00 to 2:10",
    "2:10 to 2:20", "2:20 to 2:30", "2:30 to 2:40", "2:40 to 2:45",
  ]);
  assert.match(faqs.find(({ q }) => q === "Can I stay during the session?")!.a, /stays in the house/);
  assert.match(faqs.find(({ q }) => q === "How will I know how my child is getting on?")!.a, /parent portal.*handover note/);
  const pricing = renderToStaticMarkup(createElement(PricingTable, { availability: { total: 5, remaining: 1 } }));
  assert.match(pricing, /£60 a session/);
  assert.match(pricing, /£50 a session/);
  assert.match(pricing, /£56 a session/);
  const schema = JSON.stringify(organisationSchema());
  assert.match(schema, /"price":60/);
  assert.match(schema, /"unitText":"session"/);
});
