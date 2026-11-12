import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesActionActor } from "./portal/action-actor-state";

test("stale forms cannot act after an account or session switch", () => {
  const actor = { userId: "one", authSessionId: "session-one" };
  assert.equal(matchesActionActor(actor, "one", "one", "session-one"), true);
  assert.equal(matchesActionActor(actor, "two", "two", "session-two"), false);
  assert.equal(matchesActionActor(actor, "one", "one", "session-two"), false);
  assert.equal(matchesActionActor(actor, "one", null, null), false);
});
