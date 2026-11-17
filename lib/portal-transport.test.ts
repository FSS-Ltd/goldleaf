import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { neonConfig } from "@neondatabase/serverless";
import { configurePortalTransport, localPortalTransport } from "./portal/transport";

const valid = {
  NODE_ENV: "development",
  GOLDLEAF_PORTAL_LOCAL_PROXY_URL: "http://127.0.0.1:8080",
  GOLDLEAF_PORTAL_DATABASE_URL: "postgresql://writer:secret@db.localtest.me/goldleaf_auth_qa",
  GOLDLEAF_PORTAL_EVENT_DATABASE_URL: "postgres://listener:secret@localhost:5432/goldleaf_auth_qa",
};

test("unconfigured transport leaves driver defaults unchanged", () => {
  assert.equal(localPortalTransport({ NODE_ENV: "production" }), undefined);
  assert.equal(localPortalTransport({ ...valid, GOLDLEAF_PORTAL_LOCAL_PROXY_URL: "" }), undefined);
});

test("local transport accepts only development and synthetic local databases", () => {
  assert.deepEqual(localPortalTransport(valid), {
    fetchEndpoint: "http://127.0.0.1:8080/sql",
    wsProxy: "127.0.0.1:8080/v1",
    requestTimeoutMs: 30_000,
  });
  for (const host of ["localhost", "127.0.0.1", "[::1]", "db.localtest.me"]) {
    assert.ok(localPortalTransport({ ...valid, GOLDLEAF_PORTAL_DATABASE_URL: `postgres://u:p@${host}/goldleaf_auth_qa` }));
  }
});

test("invalid transport configuration fails closed", () => {
  for (const override of [
    { NODE_ENV: "production" }, { NODE_ENV: "test" },
    ...[
      "https://localhost:8080", "http://remote.example", "http://127.1:8080",
      "http://user:pass@localhost", "http://@localhost", "http://localhost/path",
      "http://localhost/?x=1", "http://localhost/#x", "invalid",
    ].map((value) => ({ GOLDLEAF_PORTAL_LOCAL_PROXY_URL: value })),
    ...[
      "postgres://u:p@remote.example/goldleaf_auth_qa",
      "postgres://u:p@x.db.localtest.me/goldleaf_auth_qa",
      "postgres://u:p@127.1/goldleaf_auth_qa", "https://localhost/goldleaf_auth_qa",
      "postgres://localhost/other", "postgres://localhost/goldleaf_auth_qa/extra",
      "postgres://localhost/other/../goldleaf_auth_qa",
      "postgres://localhost/goldleaf_auth_qa?sslmode=disable",
      "postgres://localhost/goldleaf_auth_qa#x", "invalid", "",
    ].flatMap((value) => [
      { GOLDLEAF_PORTAL_DATABASE_URL: value }, { GOLDLEAF_PORTAL_EVENT_DATABASE_URL: value },
    ]),
  ]) {
    assert.throws(() => localPortalTransport({ ...valid, ...override }));
  }
});

test("driver configuration changes only after both database URLs pass validation", () => {
  const original = neonConfig.fetchEndpoint;
  try {
    configurePortalTransport({ NODE_ENV: "production" });
    assert.equal(neonConfig.fetchEndpoint, original);
    assert.throws(() => configurePortalTransport({ ...valid, GOLDLEAF_PORTAL_EVENT_DATABASE_URL: "postgres://remote.example/goldleaf_auth_qa" }));
    assert.equal(neonConfig.fetchEndpoint, original);
    configurePortalTransport(valid);
    const endpoint = neonConfig.fetchEndpoint;
    assert.equal(typeof endpoint, "function");
    if (typeof endpoint !== "function") throw new Error("Expected endpoint function");
    assert.equal(endpoint("db.localtest.me", 5432), "http://127.0.0.1:8080/sql");
    assert.throws(() => endpoint("remote.example", 5432));
  } finally {
    neonConfig.fetchEndpoint = original;
  }
});


test("portal database keeps the five-second default outside local mode", () => {
  const source = readFileSync("lib/portal/database.ts", "utf8");
  assert.match(source, /AbortSignal\.timeout\(transport\?\.requestTimeoutMs \?\? 5_000\)/);
  assert.equal(localPortalTransport({ NODE_ENV: "production" }), undefined);
});
