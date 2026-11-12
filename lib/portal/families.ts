import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";

import { familySchema, familyMemberSchema, staffSchema, familyInputSchema, familyFoundingInputSchema, idResultSchema } from "./schemas";

export async function listFamilies() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(familySchema).parse(await sql`SELECT * FROM portal.list_families(${userId})`);
}

export async function readFamily(familyId: string) {
  const id = z.string().uuid().parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = z.array(familySchema).max(1).parse(await sql`SELECT * FROM portal.read_family(${userId}, ${id})`);
  return rows[0] ?? null;
}

export async function listFamilyMemberships(familyId: string) {
  const id = z.string().uuid().parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(familyMemberSchema).parse(await sql`SELECT * FROM portal.family_memberships(${userId}, ${id})`);
}

export async function listStaff() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(staffSchema).parse(await sql`SELECT * FROM portal.list_staff(${userId})`);
}

export async function createFamilyWithInvitation(input: unknown) {
  const data = familyInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const familyId = data.familyId;
  const token = randomBytes(32).toString("base64url");
  const digest = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await sql.transaction([
    sql`SELECT portal.create_family(${userId}, ${data.name}, ${familyId}) AS id`,
    sql`SELECT portal.issue_invitation(${userId}, ${familyId}, ${data.email}, ${digest}::bytea, ${expires}::timestamptz) AS id`,
    sql`SELECT portal.set_founding(${userId}, ${familyId}, ${data.founding}) AS enabled`,
  ]);
  idResultSchema.parse(result[0]);
  const invitation = idResultSchema.parse(result[1])[0];
  z.array(z.object({ enabled: z.literal(true) })).length(1).parse(result[2]);
  return { familyId, invitationId: invitation.id, token, expiresAt: expires };
}

export async function setFamilyFounding(input: unknown) {
  const { familyId, founding } = familyFoundingInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.set_founding(${userId}, ${familyId}, ${founding}) AS success`;
  return z.array(z.object({ success: z.literal(true) })).length(1).parse(rows)[0].success;
}
