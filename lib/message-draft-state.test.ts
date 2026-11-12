import assert from "node:assert/strict";
import { test } from "node:test";
import {
  messageDraftKey,
  messageDraftReducer,
} from "./portal/message-draft-state";
test("drafts remain separate by role and target; stale acknowledgements cannot clear a newer operation", () => {
  const a = messageDraftKey("parent", "message", "family-a"),
    b = messageDraftKey("parent", "message", "family-b");
  const first = {
      operationId: "one",
      body: "first",
      uncertain: true,
      pending: false,
    },
    second = {
      operationId: "two",
      body: "second",
      uncertain: false,
      pending: false,
    };
  let state = messageDraftReducer({}, { type: "set", key: a, draft: first });
  state = messageDraftReducer(state, { type: "set", key: b, draft: second });
  assert.equal(state[a].body, "first");
  assert.equal(state[b].body, "second");
  state = messageDraftReducer(state, { type: "set", key: a, draft: second });
  state = messageDraftReducer(state, {
    type: "clear",
    key: a,
    operationId: "one",
  });
  assert.equal(state[a].operationId, "two");
  state = messageDraftReducer(state, {
    type: "clear",
    key: a,
    operationId: "two",
  });
  assert.equal(state[a], undefined);
  assert.equal(state[b].body, "second");
});

test("pending payload cannot be replaced by a stale input event", () => {
  const key = "parent:message:family";
  const pending = {
    operationId: "op",
    body: "original",
    uncertain: true,
    pending: true,
  };
  const state = messageDraftReducer(
    { [key]: pending },
    {
      type: "set",
      key,
      draft: { ...pending, body: "changed", uncertain: false, pending: false },
    },
  );
  assert.equal(state[key].body, "original");
});
