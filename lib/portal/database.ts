import "server-only";
import { neon } from "@neondatabase/serverless";
import { configurePortalTransport } from "./transport";

export function portalDatabase() {
  const transport = configurePortalTransport();
  const url = process.env.GOLDLEAF_PORTAL_DATABASE_URL;
  if (!url) throw new Error("Portal database is not configured");
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(transport?.requestTimeoutMs ?? 5_000) } });
}
