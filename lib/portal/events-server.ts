import "server-only";
import { Client } from "@neondatabase/serverless";
import { openEventStream, type EventClient } from "./events-stream";

export async function openPortalEventStream(
  subject: string,
  expiry: number,
  signal: AbortSignal,
): Promise<Response> {
  const connectionString = process.env.GOLDLEAF_PORTAL_EVENT_DATABASE_URL;
  try {
    if (
      !connectionString ||
      new URL(connectionString).hostname.includes("-pooler.")
    )
      return new Response("Event stream unavailable", {
        status: 503,
        headers: { "X-Portal-Events-Configuration": "missing" },
      });
  } catch {
    return new Response("Event stream unavailable", {
      status: 503,
      headers: { "X-Portal-Events-Configuration": "missing" },
    });
  }
  const client = new Client({ connectionString });
  const adapter: EventClient = {
    connect: () => client.connect(),
    query: async (text, values) => client.query(text, values),
    onError: (listener) => {
      client.on("error", listener);
    },
    onEnd: (listener) => {
      client.on("end", listener);
    },
    onNotification: (listener) => {
      client.on("notification", listener);
    },
    end: () => client.end(),
  };
  return openEventStream(adapter, subject, expiry, signal);
}
