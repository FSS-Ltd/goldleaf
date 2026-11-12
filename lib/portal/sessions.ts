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

const scopedSessionRow = sessionRow.extend({
  child_name: z.string().min(1).max(120),
  family_name: z.string().nullable(),
});
export type ScopedSession = z.infer<typeof scopedSessionRow>;

export async function readScopedSession(sessionId: unknown, role: "parent" | "staff" | "admin"): Promise<ScopedSession | null> {
  const session = uuid.parse(sessionId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = z.array(scopedSessionRow).max(1).parse(await sql`SELECT * FROM portal.read_scoped_session(${userId},${session},${role})`);
  return rows[0] ?? null;
}

export async function listStaffSessions(): Promise<ScopedSession[]> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(scopedSessionRow).parse(await sql`SELECT * FROM portal.list_staff_sessions(${userId})`);
}

export async function listAdminSessions(day: string): Promise<ScopedSession[]> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(scopedSessionRow).parse(await sql`SELECT * FROM portal.list_admin_sessions(${userId},${day}::date)`);
}
