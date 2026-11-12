import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "../app/error";
import PublicError from "../app/(public)/error";
import PublicNotFound from "../components/PublicNotFound";
import { PublicShell } from "../components/PublicShell";

test("public error boundary reuses the existing error page", () => {
  assert.equal(PublicError, ErrorPage);
});

for (const [name, content] of [
  ["error", createElement(ErrorPage, { error: new Error("test"), reset: () => {} })],
  ["not found", createElement(PublicNotFound)],
] as const) {
  test(`public ${name} has the standard shell and one main landmark`, () => {
    const html = renderToStaticMarkup(createElement(PublicShell, null, content));
    assert.equal((html.match(/<header\b/g) ?? []).length, 1);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1);
    assert.equal((html.match(/<footer\b/g) ?? []).length, 1);
    assert.match(html, /href="#main"[^>]*>Skip to content/);
  });
}
