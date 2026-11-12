export type PortalRole = "admin" | "parent" | "staff";

const links: Record<PortalRole, { href: string; label: string }> = {
  admin: { href: "/admin/today", label: "Admin portal" },
  parent: { href: "/parent", label: "Family portal" },
  staff: { href: "/staff", label: "Staff portal" },
};

export function portalRoleLinks(roles: PortalRole[]) {
  const unique = (["admin", "parent", "staff"] as const).filter((role) => roles.includes(role));
  return unique.length > 1 ? unique.map((role) => ({ ...links[role], role })) : [];
}
