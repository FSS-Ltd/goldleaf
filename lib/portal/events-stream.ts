import { z } from "zod";

const notice = z
  .object({
    kind: z.enum([
      "access",
      "message",
      "request",
      "session",
      "session_public",
      "child",
      "learning",
    ]),
    id: z.string().uuid(),
  })
  .strict();
const encoder = new TextEncoder();
export type EventClient = {
  connect(): Promise<void>;
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: { event?: string | null; active: boolean }[] }>;
  onError(listener: () => void): void;
  onEnd(listener: () => void): void;
  onNotification(
    listener: (message: { channel: string; payload?: string }) => void,
  ): void;
  end(): Promise<void>;
};

export async function openEventStream(
  client: EventClient,
  subject: string,
  expiry: number,
  signal: AbortSignal,
): Promise<Response> {
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (deadline) clearTimeout(deadline);
    signal.removeEventListener("abort", close);
    try {
      controller?.close();
    } catch {
      /* Already closed by the consumer. */
    }
    void client.end().catch(() => {});
  };
  const emit = (kind: string) => {
    if (!closed)
      controller?.enqueue(encoder.encode(`data: {"type":"${kind}"}\n\n`));
  };
  let processing = Promise.resolve();
  client.onError(close);
  client.onEnd(close);
  client.onNotification((message) => {
    if (closed || message.channel !== "portal_changes" || !message.payload)
      return;
    let raw: unknown;
    try {
      raw = JSON.parse(message.payload);
    } catch {
      return;
    }
    const parsed = notice.safeParse(raw);
    if (!parsed.success) return;
    processing = processing
      .then(async () => {
        if (closed) return;
        const result = await client.query(
          "SELECT portal.resolve_portal_event($1,$2,$3::uuid) AS event, portal.portal_event_active($1) AS active",
          [subject, parsed.data.kind, parsed.data.id],
        );
        if (closed) return;
        const row = result.rows[0];
        if (row?.event === "change" || row?.event === "access_changed")
          emit(row.event);
        if (!row?.active) close();
      })
      .catch(close);
  });
  signal.addEventListener("abort", close, { once: true });
  try {
    await client.connect();
    if (closed || signal.aborted) {
      close();
      return new Response(null, { status: 499 });
    }
    await client.query("LISTEN portal_changes");
    const result = await client.query(
      "SELECT portal.portal_event_active($1) AS active",
      [subject],
    );
    if (!result.rows[0]?.active || closed || signal.aborted) {
      close();
      return new Response(null, { status: 403 });
    }
    const remaining = Math.min(expiry * 1000 - Date.now(), 55_000);
    if (remaining <= 0) {
      close();
      return new Response(null, { status: 401 });
    }
    const stream = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
        emit("ready");
        heartbeat = setInterval(() => {
          if (!closed) controller?.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 20_000);
        deadline = setTimeout(close, remaining);
      },
      cancel: close,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    close();
    return new Response("Event stream unavailable", { status: 503 });
  }
}
