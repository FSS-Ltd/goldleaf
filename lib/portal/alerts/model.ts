import { z } from "zod";

export const payloadSchema = z.strictObject({
  from: z.string().min(1).max(320),
  to: z.email().max(320),
  subject: z.literal("You have a Goldleaf update"),
  text: z.string().max(2048),
});
export type AlertPayload = z.infer<typeof payloadSchema>;
export type Claim = { delivery_id: string; lease_token: string; subject: string; payload: AlertPayload | null; idempotency_key: string | null; first_attempt_at: Date | null; attempts: number };
export type IdentityLookup = (subject: string, signal: AbortSignal) => Promise<string[] | null>;
export type MailSubmit = (payload: AlertPayload, key: string, signal: AbortSignal) => Promise<"sent" | "retry">;

export function portalOrigin(value: string, allowLocalHttp = false): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!/^[A-Za-z0-9.-]+$/.test(url.hostname) || url.username || url.password || (url.protocol !== "https:" && !(allowLocalHttp && local && url.protocol === "http:"))) throw new Error("Invalid portal origin");
  return url.origin;
}

export function createPayload(from: string, to: string, origin: string): AlertPayload {
  return payloadSchema.parse({ from, to, subject: "You have a Goldleaf update", text: `There is an update in your Goldleaf portal. Sign in to view it:\n\n${origin}/portal` });
}

export function retryAt(now: Date, attempt: number): Date {
  return new Date(now.getTime() + Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 60 * 60_000));
}
