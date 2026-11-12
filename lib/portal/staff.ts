import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { idResultSchema } from "./schemas";
import { pendingStaffInvitationSchema, staffAssignmentSchema, staffFamilySchema, staffInvitationSchema } from "./staff-schemas";

export async function issueStaffInvitation(input: unknown) {
  const { email } = staffInvitationSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const token = randomBytes(32).toString("base64url");
  const digest = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.issue_staff_invitation(${userId}, ${email}, ${digest}::bytea, ${expiresAt}::timestamptz) AS id`;
  return { invitationId: idResultSchema.parse(rows)[0].id, token, expiresAt };
}

export async function revokeStaffInvitation(invitationId: string) {
  const id = z.string().uuid().parse(invitationId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.revoke_staff_invitation(${userId}, ${id})`;
}

export async function setStaffFamilyAccess(input: unknown) {
  const { staffId, familyId, enabled } = staffAssignmentSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.set_staff_family_access(${userId}, ${staffId}, ${familyId}, ${enabled})`;
}

export async function listPendingStaffInvitations() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(pendingStaffInvitationSchema).parse(await sql`SELECT * FROM portal.list_pending_staff_invitations(${userId})`);
}

export async function listStaffFamilyAssignments(staffId: string) {
  const id = z.string().uuid().parse(staffId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(staffFamilySchema).parse(await sql`SELECT * FROM portal.list_staff_family_assignments(${userId}, ${id})`);
}

export async function listAssignedStaffFamilies() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(staffFamilySchema).parse(await sql`SELECT * FROM portal.list_assigned_staff_families(${userId})`);
}
