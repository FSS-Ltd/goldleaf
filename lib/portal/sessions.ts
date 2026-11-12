import "server-only";
import { z } from "zod";
import { site } from "@/content/site";
import { sessionBlocks } from "@/content/session";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { sessionInput, sessionChange, sessionRow, uuid, uuidResult, type Session } from "./learning-schemas";

export { sessionBlocks };
export async function scheduleSession(input: unknown): Promise<string> {
  const value = sessionInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return uuidResult.parse(await sql`SELECT portal.schedule_child_session(${userId},${value.childId},${value.startsAt}::timestamptz,${site.sessionMinutes},${value.id},${value.locationLabel}) AS result`)[0].result;
}
export async function listSessions(familyId: unknown): Promise<Session[]> {
  const family = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(sessionRow).parse(await sql`SELECT * FROM portal.list_child_sessions(${userId},${family})`);
}
export async function changeSession(input: unknown): Promise<void> {
  const value = sessionChange.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.update_session(${userId},${value.sessionId},${value.status},${value.attendance})`;
}

export async function rescheduleSession(input: unknown): Promise<void> {
  const value = z.object({ sessionId: uuid, startsAt: z.iso.datetime({ offset: true }) }).strict().parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.reschedule_child_session(${userId},${value.sessionId},${value.startsAt}::timestamptz)`;
}

export async function setSessionLocation(input: unknown): Promise<void> {
  const value = z.object({ sessionId: uuid, locationLabel: z.string().trim().min(1).max(200).nullable() }).strict().parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.set_session_location(${userId},${value.sessionId},${value.locationLabel})`;
}
