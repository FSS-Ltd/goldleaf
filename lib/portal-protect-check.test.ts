import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveProtectChecks, type ProtectCheck } from "./portal/protect-check";
import { protectSdkUrl } from "./portal/protect-widget";

test("submits each chained proof before continuing", async () => {
  const checks: ProtectCheck[] = [{ sdkUrl: "https://example.invalid/a", token: "one" }, { sdkUrl: "https://example.invalid/b", token: "two" }];
  const submitted: string[] = [];
  const source = {
    get protectCheck() { return checks[0] ?? null; },
    async submitProtectCheck({ proofToken }: { proofToken: string }) { submitted.push(proofToken); checks.shift(); return { error: null }; },
  };
  await resolveProtectChecks(source, async (check) => `proof-${check.token}`, new AbortController().signal);
  assert.deepEqual(submitted, ["proof-one", "proof-two"]);
});

test("challenge scripts reject insecure or credential-bearing URLs before loading", async () => {
  for (const sdkUrl of ["http://example.invalid/a", "https://user:password@example.invalid/a"]) {
    assert.throws(() => protectSdkUrl(sdkUrl));
  }
});

test("expired, cancelled and failed checks never proceed", async () => {
  let submitted = false;
  const source = { protectCheck: { sdkUrl: "https://example.invalid/a", token: "one", expiresAt: 1 }, async submitProtectCheck() { submitted = true; return { error: null }; } };
  await assert.rejects(resolveProtectChecks(source, async () => "proof", new AbortController().signal));
  assert.equal(submitted, false);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(resolveProtectChecks({ ...source, protectCheck: { sdkUrl: "https://example.invalid/a", token: "one" } }, async () => "proof", controller.signal));
  assert.equal(submitted, false);
  const failed = { protectCheck: { sdkUrl: "https://example.invalid/a", token: "one" }, async submitProtectCheck() { return { error: {} }; } };
  await assert.rejects(resolveProtectChecks(failed, async () => "proof", new AbortController().signal));
});

test("a repeating challenge is bounded", async () => {
  let attempts = 0;
  const source = { protectCheck: { sdkUrl: "https://example.invalid/a", token: "one" }, async submitProtectCheck() { attempts++; return { error: null }; } };
  await assert.rejects(resolveProtectChecks(source, async () => "proof", new AbortController().signal));
  assert.equal(attempts, 5);
});
