import "server-only";
import { listChildren } from "./children";
import { readFamily } from "./families";
import { requireRole } from "./require-role";

export async function parentChildren() {
  const { identity, memberships } = await requireRole("parent");
  const familyIds = memberships.filter((membership) => membership.role === "parent").map((membership) => membership.family_id);
  const families = await Promise.all(familyIds.map(async (id) => ({ family: await readFamily(id), children: await listChildren(id) })));
  return { identity, memberships, families: families.filter((item) => item.family !== null) };
}
