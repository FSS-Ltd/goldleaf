import assert from "node:assert/strict";
import { test } from "node:test";
import { supportedAuthFactors } from "./portal/auth-factor";

test("only provider-offered and implemented second factors are offered", () => {
  assert.deepEqual(supportedAuthFactors([{ strategy: "email_code" }, { strategy: "email_link" }, { strategy: "totp" }, { strategy: "email_code" }]), ["email_code", "totp"]);
  assert.deepEqual(supportedAuthFactors([{ strategy: "email_link" }]), []);
});
