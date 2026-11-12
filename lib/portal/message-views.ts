import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { timestamp, uuid } from "./learning-schemas";
import {
  unreadCount,
  messageRow,
  messageInput,
  messageSequence,
  messageReadInput,
} from "./messages-schemas";

const roleSchema = z.enum(["admin", "parent", "staff"]);
const familySchema = z.object({
  id: uuid,
  display_name: z.string().nullable(),
  unread: unreadCount,
});
const authorSchema = z.object({
  id: uuid,
  subject: z.string(),
  role: roleSchema,
});
const sessionSchema = z.object({
  id: uuid,
  child_name: z.string(),
  starts_at: timestamp,
  duration_minutes: z.number().int().positive(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  location_label: z.string().nullable(),
});
const requestSchema = z.object({
  id: uuid,
  family_id: uuid,
  family_name: z.string().nullable(),
  parent_subject: z.string(),
  session_id: uuid,
  child_name: z.string(),
  starts_at: timestamp,
  duration_minutes: z.number().int().positive(),
  session_status: z.enum([
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ]),
  location_label: z.string().nullable(),
  body: z.string(),
  created_at: timestamp,
  resolved_at: timestamp.nullable(),
  resolution: z.string().nullable(),
});
export type MessageFamily = z.infer<typeof familySchema>;
export type MessageSession = z.infer<typeof sessionSchema>;
export type RequestContext = Omit<
  z.infer<typeof requestSchema>,
  "parent_subject"
> & { parent_name: string };
export type MessageAuthor = { id: string; name: string; own: boolean };

async function lookupNames(subjects: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(subjects)];
  if (unique.length === 0) return names;
  try {
    const clerk = await clerkClient();
    for (let index = 0; index < unique.length; index += 100) {
      const result = await clerk.users.getUserList({
        userId: unique.slice(index, index + 100),
        limit: 100,
      });
      for (const user of result.data) {
        const name = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (name) names.set(user.id, name);
      }
    }
  } catch {
    /* Safe role labels remain available when identity lookup fails. */
  }
  return names;
}

export async function listMessageFamilies(
  role: "admin" | "parent" | "staff",
): Promise<MessageFamily[]> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z
    .array(familySchema)
    .parse(
      await sql`SELECT * FROM portal.message_family_summaries(${userId},${role})`,
    );
}
export async function listMessageSessions(
  familyId: string,
  role: "admin" | "parent" | "staff",
): Promise<MessageSession[]> {
  const id = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z
    .array(sessionSchema)
    .parse(
      await sql`SELECT * FROM portal.message_sessions(${userId},${role},${id})`,
    );
}
export async function listMessageRequestContexts(
  role: "admin" | "parent",
): Promise<RequestContext[]> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = z
    .array(requestSchema)
    .parse(
      await sql`SELECT * FROM portal.message_request_context(${userId},${role})`,
    );
  const names =
    role === "admin"
      ? await lookupNames(rows.map((row) => row.parent_subject))
      : new Map<string, string>();
  return rows.map(({ parent_subject, ...row }) => ({
    ...row,
    parent_name:
      role === "parent" ? "You" : (names.get(parent_subject) ?? "Parent"),
  }));
}
export async function listMessageAuthors(
  familyId: string,
  role: "admin" | "parent" | "staff",
): Promise<MessageAuthor[]> {
  const id = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const authors = z
    .array(authorSchema)
    .parse(
      await sql`SELECT * FROM portal.message_author_identities(${userId},${role},${id})`,
    );
  const names = await lookupNames(authors.map((author) => author.subject));
  return authors.map((author) => ({
    id: author.id,
    name:
      names.get(author.subject) ??
      { admin: "Administrator", parent: "Parent", staff: "Staff" }[author.role],
    own: author.subject === userId,
  }));
}

export async function readMessageThread(
  role: "admin" | "parent" | "staff",
  familyId: string,
) {
  const id = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z
    .array(messageRow)
    .parse(
      await sql`SELECT * FROM portal.message_view_thread(${userId},${role},${id})`,
    );
}
export async function sendMessageAsRole(
  role: "admin" | "parent" | "staff",
  input: unknown,
): Promise<string> {
  const value = messageInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows =
    await sql`SELECT portal.send_message_as_role(${userId},${role},${value.familyId},${value.operationId},${value.body})::text AS result`;
  return z
    .array(z.object({ result: messageSequence }))
    .length(1)
    .parse(rows)[0].result;
}
export async function markMessagesAsRole(
  role: "admin" | "parent" | "staff",
  input: unknown,
): Promise<void> {
  const value = messageReadInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.mark_messages_as_role(${userId},${role},${value.familyId},${value.through}::bigint)`;
}

export async function resolveRequestChecked(input: {
  requestId: string;
  resolution: string;
  newStart: string | null;
  expectedStart: string;
  expectedStatus: "scheduled" | "in_progress" | "completed" | "cancelled";
}): Promise<void> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.resolve_request_checked(${userId},${input.requestId},${input.resolution},${input.newStart}::timestamptz,${input.expectedStart}::timestamptz,${input.expectedStatus})`;
}
