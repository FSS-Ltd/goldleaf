import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";

const count = z.string().regex(/^(0|[1-9]\d*)$/);
const row = z.object({ unread: count, open_requests: count });
export type MessageAttentionCounts = { unread: string; openRequests: string };

export async function getMessageAttention(
  role: "admin" | "parent" | "staff",
): Promise<MessageAttentionCounts | null> {
  const { userId } = await requirePortalIdentity();
  try {
    const sql = portalDatabase();
    const rows = await sql`SELECT * FROM portal.message_attention(${userId}, ${role})`;
    const result = row.parse(rows[0]);
    return { unread: result.unread, openRequests: result.open_requests };
  } catch {
    return null;
  }
}
