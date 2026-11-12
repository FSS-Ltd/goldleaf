import "server-only";
import { neon } from "@neondatabase/serverless";

export function portalDatabase() {
  const url = process.env.GOLDLEAF_PORTAL_DATABASE_URL;
  if (!url) throw new Error("Portal database is not configured");
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
}
