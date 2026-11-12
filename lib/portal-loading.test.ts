import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortalLoading } from "../components/portal/loading/PortalLoading";

test("page loading announces progress and hides decorative shapes", () => {
  const html = renderToStaticMarkup(createElement(PortalLoading, { label: "Opening sessions…", variant: "list" }));
  assert.match(html, /<main\b/);
  assert.match(html, /role="status"/);
  assert.match(html, /Opening sessions…/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /<nav\b|<a\b|<button\b/);
});

test("content loading has no nested main and variants differ", () => {
  const message = renderToStaticMarkup(createElement(PortalLoading, { label: "Opening messages…", variant: "messages", contentOnly: true }));
  const account = renderToStaticMarkup(createElement(PortalLoading, { label: "Loading your account…", variant: "account", contentOnly: true }));
  assert.doesNotMatch(message, /<main\b/);
  assert.doesNotMatch(account, /<main\b/);
  assert.match(message, /portal-loading--messages/);
  assert.match(account, /portal-loading--account/);
  assert.notEqual(message, account);
});
