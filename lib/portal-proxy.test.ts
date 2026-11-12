import assert from "node:assert/strict";
import { test } from "node:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../proxy";

test("Clerk frontend proxy requests reach the middleware", () => {
  for (const url of ["/__clerk", "/__clerk/v1/client"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true);
  }
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/about" }), false);
});
