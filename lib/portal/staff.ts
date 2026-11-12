import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { Resend } from "resend";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { idResultSchema } from "./schemas";
import { pendingStaffInvitationSchema, staffAssignmentSchema, staffAssignmentsSchema, staffFamilySchema, staffInvitationSchema } from "./staff-schemas";
import { sendInvitationMail } from "./invitation-mail";

export async function issueStaffInvitation(input: unknown, requestId: string) {
  const { email } = staffInvitationSchema.parse(input);
  const request = z.string().uuid().parse(requestId);
  const { userId } = await requirePortalIdentity();
  const token = randomBytes(32).toString("base64url");
  const digest = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.issue_staff_delivery(${userId}, ${email}, ${digest}::bytea, ${expiresAt}::timestamptz, ${request}) AS id`;
  return { invitationId: idResultSchema.parse(rows)[0].id, token, expiresAt };
}

export async function listStaffDeliveries() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(z.object({ id: z.string().uuid(), email: z.email(), delivery_status: z.enum(["pending", "sent", "failed"]), active: z.boolean() })).parse(await sql`SELECT * FROM portal.list_staff_deliveries(${userId})`);
}

export async function deliverStaffInvitation(invitationId: string, token: string): Promise<"sent" | "failed"> {
  const invitation = z.string().uuid().parse(invitationId);
  const bearer = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(token);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const digest = `\\x${createHash("sha256").update(bearer).digest("hex")}`;
  const rows = z.array(z.object({ email: z.email() })).length(1).parse(await sql`SELECT * FROM portal.staff_delivery_recipient(${userId}, ${invitation}, ${digest}::bytea)`);
  let status: "sent" | "failed" = "failed";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PORTAL_INVITE_FROM_EMAIL;
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (key && from && origin) {
    const resend = new Resend(key);
    status = await sendInvitationMail((message) => resend.emails.send(message), { from, to: rows[0].email, token: bearer, origin, requireHttps: process.env.NODE_ENV === "production", purpose: "staff" });
  }
  await sql`SELECT portal.mark_staff_delivery(${userId}, ${invitation}, ${status})`;
  return status;
}

export async function setStaffAssignments(staffId: string, familyIds: unknown) {
  const { staffId: staff, familyIds: families } = staffAssignmentsSchema.parse({ staffId, familyIds });
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.set_staff_assignments(${userId}, ${staff}, ${families}::uuid[])`;
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
