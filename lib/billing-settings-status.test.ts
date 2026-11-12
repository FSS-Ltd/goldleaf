import assert from "node:assert/strict";
import { test } from "node:test";
import { billingSettingsStatus } from "./portal/billing-settings-status";

test("billing settings status distinguishes saving, failure and committed changes", () => {
  assert.equal(billingSettingsStatus(true, false, false), "Saving…");
  assert.equal(billingSettingsStatus(true, true, true), "Saving…");
  assert.equal(billingSettingsStatus(false, true, false), "Unsaved changes");
  assert.equal(billingSettingsStatus(false, false, true), "Unsaved changes");
  assert.equal(billingSettingsStatus(false, false, false), "Saved settings");
});
