import "server-only";
import { z } from "zod";
import { getPortalIdentity } from "./identity";
import { portalDatabase } from "./database";

import { membershipSchema } from "./schemas";

export async function requirePortalIdentity() {
  const identity = await getPortalIdentity();
  if (!identity) throw new Error("Authentication required");
  return identity;
}

export async function getActiveMemberships() {
  const identity = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT role, family_id FROM portal.active_memberships(${identity.userId})`;
  return z.array(membershipSchema).parse(rows);
}
