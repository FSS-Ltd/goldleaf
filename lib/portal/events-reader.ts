import { parsePortalEvent, type PortalEvent } from "./events-protocol";

export async function cancelUnconsumedStream(
  stream: ReadableStream<Uint8Array> | null,
): Promise<void> {
  if (!stream) return;
  try {
    await stream.cancel();
  } catch {
    /* The response may already be closed or failed. */
  }
}

// Every connection owns exactly one reader, even when an event stops consumption.
export async function consumePortalEvents(
  stream: ReadableStream<Uint8Array>,
  isCurrent: () => boolean,
  onEvent: (event: PortalEvent) => boolean,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (isCurrent()) {
      const chunk = await reader.read();
      if (chunk.done || !isCurrent()) return;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 4096) throw new Error("Invalid stream");
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!isCurrent()) return;
        const event = parsePortalEvent(frame);
        if (event && !onEvent(event)) return;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* The stream may already have failed. */
    }
    reader.releaseLock();
  }
}
