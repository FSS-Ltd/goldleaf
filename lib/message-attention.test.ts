import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageAttention } from "../components/portal/MessageAttention";

const render = (role: "admin" | "parent" | "staff", counts: { unread: string; openRequests: string } | null) =>
  renderToStaticMarkup(createElement(MessageAttention, { role, counts }));

test("announces distinct admin counts and caps their visible total", () => {
  const html = render("admin", { unread: "100000000000000000000", openRequests: "2" });
  assert.match(html, /99\+/);
  assert.match(html, /100000000000000000000 unread messages, 2 open requests/);
});

test("shows only unread messages for staff and parent", () => {
  for (const role of ["staff", "parent"] as const) {
    const html = render(role, { unread: "3", openRequests: "8" });
    assert.match(html, /3 unread messages/);
    assert.doesNotMatch(html, /requests|8/);
  }
});

test("handles zero and unavailable counts", () => {
  assert.equal(render("parent", { unread: "0", openRequests: "0" }), "");
  assert.match(render("admin", null), /Message counts unavailable/);
});
