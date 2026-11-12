import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesActionActor,
  type ActionRole,
} from "./portal/action-actor-state";

test("stale forms cannot act after an account or session switch", () => {
  const actor = { userId: "one", authSessionId: "session-one" };
  assert.equal(matchesActionActor(actor, "one", "one", "session-one"), true);
  assert.equal(matchesActionActor(actor, "two", "two", "session-two"), false);
  assert.equal(matchesActionActor(actor, "one", "one", "session-two"), false);
  assert.equal(matchesActionActor(actor, "one", null, null), false);
});

test("parent actions use the same current-session fence", () => {
  const role: ActionRole = "parent";
  assert.equal(role, "parent");
  assert.equal(
    matchesActionActor(
      { userId: "parent", authSessionId: "s1" },
      "parent",
      "parent",
      "s2",
    ),
    false,
  );
});
