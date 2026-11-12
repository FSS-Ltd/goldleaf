import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cancelUnconsumedStream,
  consumePortalEvents,
} from "./portal/events-reader";

function source(value: string) {
  let cancelled = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(value));
    },
    cancel() {
      cancelled++;
    },
  });
  return { stream, cancelled: () => cancelled };
}
test("unavailable event cancels and releases its reader", async () => {
  const item = source('data: {"type":"unavailable"}\n\n');
  await consumePortalEvents(
    item.stream,
    () => true,
    () => false,
  );
  assert.equal(item.cancelled(), 1);
  assert.equal(item.stream.locked, false);
});
test("oversized stream cancels and releases its reader", async () => {
  const item = source("x".repeat(4097));
  await assert.rejects(
    consumePortalEvents(
      item.stream,
      () => true,
      () => true,
    ),
  );
  assert.equal(item.cancelled(), 1);
  assert.equal(item.stream.locked, false);
});
test("read errors release the reader", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error("network"));
    },
  });
  await assert.rejects(
    consumePortalEvents(
      stream,
      () => true,
      () => true,
    ),
  );
  assert.equal(stream.locked, false);
});
test("actor change after a pending read cancels and releases the reader", async () => {
  let current = true;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let cancelled = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
    },
    cancel() {
      cancelled++;
    },
  });
  const pending = consumePortalEvents(
    stream,
    () => current,
    () => true,
  );
  current = false;
  controller?.enqueue(new TextEncoder().encode('data: {"type":"ready"}\n\n'));
  await pending;
  assert.equal(cancelled, 1);
  assert.equal(stream.locked, false);
});
test("a response abandoned before acquiring a reader is cancelled", async () => {
  const item = source("");
  await cancelUnconsumedStream(item.stream);
  assert.equal(item.cancelled(), 1);
  assert.equal(item.stream.locked, false);
});
test("aborted pending read releases its reader", async () => {
  const abort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      abort.signal.addEventListener("abort", () =>
        controller.error(new Error("aborted")),
      );
    },
  });
  const pending = consumePortalEvents(
    stream,
    () => !abort.signal.aborted,
    () => true,
  );
  abort.abort();
  await assert.rejects(pending);
  assert.equal(stream.locked, false);
});
