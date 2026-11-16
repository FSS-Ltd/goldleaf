import { test } from "node:test";
import assert from "node:assert/strict";
import { createPayload, portalOrigin, retryAt } from "./portal/alerts/model";

test("alert payload is generic and uses only the validated origin", () => {
  const origin = portalOrigin("https://example.test/other?token=secret");
  assert.deepEqual(createPayload("alerts@example.test", "parent@example.test", origin), {
    from: "alerts@example.test", to: "parent@example.test", subject: "You have a Goldleaf update",
    text: "There is an update in your Goldleaf portal. Sign in to view it:\n\nhttps://example.test/portal",
  });
  assert.throws(() => portalOrigin("https://user:pass@example.test"));
  assert.throws(() => portalOrigin("http://example.test"));
  assert.throws(() => portalOrigin("http://localhost:3000"));
  assert.equal(portalOrigin("http://localhost:3000/path", true), "http://localhost:3000");
  assert.equal(retryAt(new Date(0), 100).getTime(), 3_600_000);
});
