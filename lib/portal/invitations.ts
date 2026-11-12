import "server-only";
import { createHash } from "node:crypto";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";

import { invitationInputSchema, idResultSchema } from "./schemas";

export async function acceptInvitation(input: unknown) {
  const { token, purpose } = invitationInputSchema.parse(input);
  const identity = await requirePortalIdentity();
  const sql = portalDatabase();
  const digest = `\\x${createHash("sha256").update(token).digest("hex")}`;
  const rows = await sql`SELECT portal.accept_verified_invitation(${identity.userId}, ${identity.verifiedEmails}::text[], ${digest}::bytea, ${purpose}) AS id`;
  return idResultSchema.parse(rows)[0];
}
