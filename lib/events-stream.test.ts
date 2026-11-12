import assert from "node:assert/strict";
import { test } from "node:test";
import { openEventStream, type EventClient } from "./portal/events-stream";

function fakeClient() {
  const queries: string[] = [];
  const parameters: (unknown[] | undefined)[] = [];
  let notification: (message: {
    channel: string;
    payload?: string;
  }) => void = () => {};
  let ended = false;
  let active = true;
  const client: EventClient = {
    async connect() {},
    async query(text, values) {
      queries.push(text);
      parameters.push(values);
      if (text.startsWith("LISTEN")) return { rows: [] };
      if (text.includes("resolve_portal_event"))
        return {
          rows: [
            {
              active,
              event:
                values?.[1] === "access"
                  ? "access_changed"
                  : [
                        "message",
                        "admin_change",
                        "family_profile",
                        "founding_profile",
                        "invoice_family",
                        "read_cursor",
                      ].includes(String(values?.[1]))
                    ? "change"
                    : null,
            },
          ],
        };
      return { rows: [{ active }] };
    },
    onError() {},
    onEnd() {},
    onNotification(listener) {
      notification = listener;
    },
    async end() {
      ended = true;
    },
  };
  return {
    client,
    queries,
    parameters,
    notify: (kind: string) =>
      notification({
        channel: "portal_changes",
        payload: JSON.stringify({
          kind,
          id: "10000000-0000-4000-8000-000000000001",
        }),
      }),
    revoke: () => {
      active = false;
    },
    ended: () => ended,
  };
}
test("LISTEN precedes catch-up, notifications reauthorize, and abort closes connection", async () => {
  const fake = fakeClient();
  const abort = new AbortController();
  const response = await openEventStream(
    fake.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    abort.signal,
  );
  assert.equal(response.status, 200);
  assert.equal(fake.queries[0], "LISTEN portal_changes");
  assert.match(fake.queries[1], /portal_event_active/);
  assert.equal(fake.queries.length, 2);
  assert.deepEqual(fake.parameters[1], ["user", "parent"]);
  assert.ok(response.body);
  const reader = response.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /ready/);
  fake.notify("message");
  assert.match(new TextDecoder().decode((await reader.read()).value), /change/);
  assert.equal(fake.queries.length, 3);
  assert.equal(fake.parameters[2]?.[3], "parent");
  fake.revoke();
  fake.notify("access");
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /access_changed/,
  );
  assert.equal((await reader.read()).done, true);
  assert.equal(fake.ended(), true);
  abort.abort();
});
test("inactive and cancelled connections never expose a stream", async () => {
  const fake = fakeClient();
  fake.revoke();
  const abort = new AbortController();
  const response = await openEventStream(
    fake.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    abort.signal,
  );
  assert.equal(response.status, 403);
  assert.equal(fake.ended(), true);
});
test("duplicate events are harmless and reconnect repeats authoritative catch-up", async () => {
  const first = fakeClient();
  const abort = new AbortController();
  const one = await openEventStream(
    first.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    abort.signal,
  );
  assert.ok(one.body);
  const reader = one.body.getReader();
  await reader.read();
  first.notify("message");
  first.notify("message");
  assert.match(new TextDecoder().decode((await reader.read()).value), /change/);
  assert.match(new TextDecoder().decode((await reader.read()).value), /change/);
  abort.abort();
  assert.equal((await reader.read()).done, true);
  assert.equal(first.ended(), true);
  const second = fakeClient();
  const nextAbort = new AbortController();
  const two = await openEventStream(
    second.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    nextAbort.signal,
  );
  assert.equal(second.queries.length, 2);
  assert.equal(second.queries[0], "LISTEN portal_changes");
  assert.ok(two.body);
  const next = two.body.getReader();
  assert.match(new TextDecoder().decode((await next.read()).value), /ready/);
  nextAbort.abort();
  assert.equal((await next.read()).done, true);
  assert.equal(second.ended(), true);
});
test("idle heartbeat does not query the database", async () => {
  const fake = fakeClient();
  const abort = new AbortController();
  const response = await openEventStream(
    fake.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    abort.signal,
  );
  assert.ok(response.body);
  const reader = response.body.getReader();
  await reader.read();
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /heartbeat/,
  );
  assert.equal(fake.queries.length, 2);
  abort.abort();
  assert.equal(fake.ended(), true);
});

test("new scoped invalidations reach the role-aware resolver", async () => {
  const fake = fakeClient();
  const abort = new AbortController();
  const response = await openEventStream(
    fake.client,
    "user",
    "parent",
    Date.now() / 1000 + 60,
    abort.signal,
  );
  assert.ok(response.body);
  const reader = response.body.getReader();
  await reader.read();
  for (const kind of [
    "admin_change",
    "family_profile",
    "founding_profile",
    "invoice_family",
    "read_cursor",
  ]) {
    fake.notify(kind);
    assert.match(
      new TextDecoder().decode((await reader.read()).value),
      /change/,
    );
  }
  assert.equal(fake.queries.length, 7);
  abort.abort();
});
