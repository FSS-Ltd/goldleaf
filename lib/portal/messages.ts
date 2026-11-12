import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { uuid } from "./learning-schemas";
import {
  changeRequestInput,
  changeRequestRow,
  resolveRequestInput,
  messageInput,
  messageReadInput,
  messageRow,
  messageSequence,
  unreadCount,
  type FamilyMessage,
  type SessionChangeRequest,
} from "./messages-schemas";

export async function sendFamilyMessage(input: unknown): Promise<string> {
  const value = messageInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows =
    await sql`SELECT portal.send_family_message(${userId},${value.familyId},${value.operationId},${value.body})::text AS result`;
  return z
    .array(z.object({ result: messageSequence }))
    .length(1)
    .parse(rows)[0].result;
}
export async function listFamilyMessages(
  familyId: unknown,
): Promise<FamilyMessage[]> {
  const family = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z
    .array(messageRow)
    .parse(
      await sql`SELECT * FROM portal.list_family_messages(${userId},${family})`,
    );
}
export async function markFamilyMessagesRead(input: unknown): Promise<void> {
  const value = messageReadInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.mark_family_messages_read(${userId},${value.familyId},${value.through}::bigint)`;
}
export async function familyMessageUnread(familyId: unknown): Promise<string> {
  const family = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows =
    await sql`SELECT portal.family_message_unread(${userId},${family}) AS result`;
  return z
    .array(z.object({ result: unreadCount }))
    .length(1)
    .parse(rows)[0].result;
}

export async function requestSessionChange(input: unknown): Promise<string> {
  const value = changeRequestInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows =
    await sql`SELECT portal.request_session_change(${userId},${value.sessionId},${value.operationId},${value.body}) AS result`;
  return z
    .array(z.object({ result: uuid }))
    .length(1)
    .parse(rows)[0].result;
}
export async function listSessionChangeRequests(
  familyId: unknown,
): Promise<SessionChangeRequest[]> {
  const family = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z
    .array(changeRequestRow)
    .parse(
      await sql`SELECT * FROM portal.list_session_change_requests(${userId},${family})`,
    );
}
export async function resolveSessionChange(input: unknown): Promise<void> {
  const value = resolveRequestInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.resolve_session_change(${userId},${value.requestId},${value.resolution},${value.newStart}::timestamptz)`;
}
