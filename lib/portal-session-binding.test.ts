import assert from "node:assert/strict";
import { test } from "node:test";
import { assertActiveVerification, runWithSession, sameSession } from "./portal/session-binding";

test("a pending security task stays bound to the original session and user", () => {
  const binding = { sessionId: "session-a", userId: "user-a" };
  assert.equal(sameSession(binding, "session-a", "user-a"), true);
  assert.equal(sameSession(binding, "session-b", "user-a"), false);
  assert.equal(sameSession(binding, "session-a", "user-b"), false);
  assert.equal(sameSession(binding, null, "user-a"), false);
});

test("deferred account mutation cannot replay after an actor switch", async () => {
  const binding = { sessionId: "session-a", userId: "user-a" };
  let actor = { ...binding };
  const calls: string[] = [];
  const retry = (action: string) => runWithSession(binding, () => actor, async () => { calls.push(action); });
  let resume = () => {};
  const verification = new Promise<void>((resolve) => { resume = resolve; });
  const deferred = Promise.allSettled(["name", "password", "email", "google"].map(async (action) => {
    await verification;
    return retry(action);
  }));
  actor = { sessionId: "session-b", userId: "user-b" };
  resume();
  const results = await deferred;
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.deepEqual(calls, []);
  for (const action of ["name", "password", "email", "google"]) {
    actor = { sessionId: "session-b", userId: "user-b" };
    await assert.rejects(retry(action));
  }
  assert.deepEqual(calls, []);
  actor = { ...binding };
  await retry("same-actor");
  assert.deepEqual(calls, ["same-actor"]);
});

test("cancelled or switched verification cannot complete and replay its operation", () => {
  const binding = { sessionId: "session-a", userId: "user-a" };
  let replayed = false;
  const complete = (sessionId: string, userId: string, active: boolean) => {
    assertActiveVerification(binding, sessionId, userId, active);
    replayed = true;
  };
  assert.throws(() => complete("session-a", "user-a", false));
  assert.throws(() => complete("session-b", "user-b", true));
  assert.equal(replayed, false);
  complete("session-a", "user-a", true);
  assert.equal(replayed, true);
});

test("a cancelled operation stays cancelled even if the original actor returns", async () => {
  const controller = new AbortController();
  const binding = { sessionId: "session-a", userId: "user-a", signal: controller.signal };
  controller.abort();
  let called = false;
  await assert.rejects(runWithSession(binding, () => ({ sessionId: "session-a", userId: "user-a" }), async () => { called = true; }));
  assert.equal(called, false);
});
