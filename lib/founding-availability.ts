import "server-only";
import { neon } from "@neondatabase/serverless";
import { connection } from "next/server";
import { cache } from "react";

export type FoundingAvailability = { total: number; remaining: number } | null;

export const getFoundingAvailability = cache(async (): Promise<FoundingAvailability> => {
  await connection();
  const url = process.env.GOLDLEAF_OFFER_DATABASE_URL;
  if (!url) return null;

  try {
    const sql = neon(url, { fetchOptions: { signal: AbortSignal.timeout(3000) } });
    const rows = await sql`SELECT total, remaining FROM public_offer.founding_availability`;
    const row = rows[0];
    if (rows.length !== 1 || !row || !Number.isInteger(row.total) || !Number.isInteger(row.remaining) || row.total <= 0 || row.remaining < 0 || row.remaining > row.total) {
      console.error("Founding availability returned invalid aggregate data.");
      return null;
    }
    return { total: row.total, remaining: row.remaining };
  } catch {
    console.error("Founding availability could not be read.");
    return null;
  }
});
