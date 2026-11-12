import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { idResultSchema } from "./schemas";
import { sendInvitationMail } from "./invitation-mail";

const id = z.string().uuid();
const address = z.string().trim().max(254).pipe(z.email());
const invitationRows = z.array(z.object({ id, email: address, delivery_status: z.enum(["pending", "sent", "failed"]), active: z.boolean() }));

export async function listFamilyInvitations(familyId: string) {
  const family = id.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return invitationRows.parse(await sql`SELECT * FROM portal.list_family_invitations(${userId}, ${family})`);
}

export async function issueParentInvitation(familyId: string, email: string, requestId: string) {
  const family = id.parse(familyId);
  const recipient = address.parse(email);
  const request = id.parse(requestId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const token = randomBytes(32).toString("base64url");
  const digest = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await sql`SELECT portal.issue_parent_delivery(${userId}, ${family}, ${recipient}, ${digest}::bytea, ${expires}::timestamptz, ${request}) AS id`;
  return { invitationId: idResultSchema.parse(rows)[0].id, token, email: recipient };
}

export async function revokeParentInvitation(invitationId: string) {
  const invitation = id.parse(invitationId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.revoke_invitation(${userId}, ${invitation})`;
}

export async function deliverParentInvitation(invitationId: string, token: string): Promise<"sent" | "failed"> {
  const invitation = id.parse(invitationId);
  const bearer = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(token);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const digest = `\\x${createHash("sha256").update(bearer).digest("hex")}`;
  const rows = z.array(z.object({ email: address })).length(1).parse(
    await sql`SELECT * FROM portal.invitation_delivery_recipient(${userId}, ${invitation}, ${digest}::bytea)`,
  );
  const recipient = rows[0].email;
  let status: "sent" | "failed" = "failed";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PORTAL_INVITE_FROM_EMAIL;
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (key && from && origin) {
    const resend = new Resend(key);
    status = await sendInvitationMail((message) => resend.emails.send(message), {
      from, to: recipient, token: bearer, origin, requireHttps: process.env.NODE_ENV === "production",
    });
  }
  await sql`SELECT portal.mark_invitation_delivery(${userId}, ${invitation}, ${status})`;
  return status;
}
