import assert from "node:assert/strict";
import { test } from "node:test";
import { getBoundEventToken } from "./portal/events-session";

test("a deferred token is discarded after actor change or unsubscribe", async () => {
  let actor = { userId: "user-a", sessionId: "session-a" };
  let release: (value: string) => void = () => {};
  const token = new Promise<string>((resolve) => {
    release = resolve;
  });
  const abort = new AbortController();
  const pending = getBoundEventToken(
    { ...actor, signal: abort.signal },
    () => actor,
    () => token,
  );
  actor = { userId: "user-b", sessionId: "session-b" };
  release("secret");
  assert.equal(await pending, null);
  const cancelled = new AbortController();
  cancelled.abort();
  let called = false;
  assert.equal(
    await getBoundEventToken(
      { ...actor, signal: cancelled.signal },
      () => actor,
      async () => {
        called = true;
        return "secret";
      },
    ),
    null,
  );
  assert.equal(called, false);
});
