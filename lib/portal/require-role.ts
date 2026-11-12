import "server-only";
import { redirect } from "next/navigation";
import { getPortalIdentity } from "./identity";
import { getActiveMemberships } from "./access";

export async function requireRole(role: "admin" | "parent" | "staff") {
  const identity = await getPortalIdentity();
  if (!identity) redirect("/sign-in");
  const memberships = await getActiveMemberships();
  if (!memberships.some((membership) => membership.role === role)) redirect("/portal");
  return { identity, memberships };
}
