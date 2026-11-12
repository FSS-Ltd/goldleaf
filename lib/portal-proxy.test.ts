import assert from "node:assert/strict";
import { test } from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../proxy";

test("Clerk frontend proxy requests reach the middleware", () => {
  for (const url of ["/__clerk", "/__clerk/v1/client"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true);
  }
  for (const url of ["/portal", "/portal/example", "/account", "/account/example", "/sso-callback", "/session-task/reset-password", "/invite/accept", "/sign-up", "/sign-up/verify-email-address"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true);
  }
  for (const url of ["/about", "/invite"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false);
  }
});
