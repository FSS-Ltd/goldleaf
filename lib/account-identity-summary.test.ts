import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { AccountIdentitySummary } from "../components/portal/auth/AccountIdentitySummary";

test("account summary displays the provider's primary email and linked Google identity", () => {
  const html = renderToStaticMarkup(createElement(AccountIdentitySummary, {
    user: {
      fullName: "Example Parent",
      primaryEmailAddress: { emailAddress: "parent@example.invalid", verification: { status: "verified" } },
      externalAccounts: [{ provider: "google", emailAddress: "google@example.invalid", verification: { status: "verified" } }],
    },
    pending: false,
    connectGoogle: () => {},
  }));
  assert.match(html, /Example Parent/);
  assert.match(html, /Verified.*parent@example\.invalid/);
  assert.match(html, /Connected.*google@example\.invalid/);
  assert.doesNotMatch(html, /Connect Google/);
});

test("account summary reports unavailable and unverified identities accurately", () => {
  const html = renderToStaticMarkup(createElement(AccountIdentitySummary, {
    user: { fullName: null, primaryEmailAddress: { emailAddress: "unverified@example.invalid", verification: null }, externalAccounts: [] },
    pending: true,
    connectGoogle: () => {},
  }));
  assert.match(html, /Your account/);
  assert.match(html, /Not verified/);
  assert.match(html, /Not connected/);
  assert.match(html, /disabled=""/);
});
