import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { childInput, childRow, uuid, uuidResult, type Child } from "./learning-schemas";

export async function createChild(input: unknown): Promise<string> {
  const value = childInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return uuidResult.parse(await sql`SELECT portal.create_child(${userId},${value.familyId},${value.name},${value.id}) AS result`)[0].result;
}
export async function listChildren(familyId: unknown): Promise<Child[]> {
  const family = uuid.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(childRow).parse(await sql`SELECT * FROM portal.list_children(${userId},${family})`);
}

export async function renameChild(input: unknown): Promise<void> {
  const value = z.object({ childId: uuid, name: z.string().trim().min(1).max(120) }).strict().parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.rename_child(${userId},${value.childId},${value.name})`;
}
