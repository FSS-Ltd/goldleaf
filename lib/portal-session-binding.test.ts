import assert from "node:assert/strict";
import { test } from "node:test";
import { sameSession } from "./portal/session-binding";

test("a pending security task stays bound to the original session and user", () => {
  const binding = { sessionId: "session-a", userId: "user-a" };
  assert.equal(sameSession(binding, "session-a", "user-a"), true);
  assert.equal(sameSession(binding, "session-b", "user-a"), false);
  assert.equal(sameSession(binding, "session-a", "user-b"), false);
  assert.equal(sameSession(binding, null, "user-a"), false);
});
