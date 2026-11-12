import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acknowledgeMessage,
  observeWhileVisible,
} from "./portal/message-read-ack";
test("a rejected read acknowledgement is cleared and can be retried", async () => {
  const pending = new Set<string>();
  let acknowledged = 0;
  await acknowledgeMessage(
    pending,
    "12",
    async () => {
      throw new Error("network");
    },
    () => {
      acknowledged++;
    },
  );
  assert.equal(pending.has("12"), false);
  assert.equal(acknowledged, 0);
  await acknowledgeMessage(
    pending,
    "12",
    async () => true,
    () => {
      acknowledged++;
    },
  );
  assert.equal(pending.has("12"), false);
  assert.equal(acknowledged, 1);
});

test("observation pauses while hidden and resumes once visible", () => {
  let listener: (() => void) | null = null;
  let observed = 0;
  let disconnected = 0;
  const source = {
    visibilityState: "hidden",
    addEventListener(_type: "visibilitychange", callback: () => void) {
      listener = callback;
    },
    removeEventListener() {
      listener = null;
    },
  };
  const stop = observeWhileVisible(
    source,
    () => {
      observed++;
    },
    () => {
      disconnected++;
    },
  );
  assert.equal(observed, 0);
  source.visibilityState = "visible";
  const notify = () => {
    if (listener) listener();
  };
  notify();
  assert.equal(observed, 1);
  source.visibilityState = "hidden";
  notify();
  assert.equal(observed, 1);
  stop();
  assert.equal(listener, null);
  assert.equal(disconnected, 4);
});
