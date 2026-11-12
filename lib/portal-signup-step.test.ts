import assert from "node:assert/strict";
import { test } from "node:test";
import { signupStep } from "./portal/signup-step";

test("signup handles only provider-required username and email verification", () => {
  assert.equal(signupStep("complete", [], []), "complete");
  assert.equal(signupStep("missing_requirements", ["username"], ["email_address"]), "username");
  assert.equal(signupStep("missing_requirements", [], ["email_address"]), "verify");
  assert.equal(signupStep("missing_requirements", ["phone_number"], []), "unsupported");
});
