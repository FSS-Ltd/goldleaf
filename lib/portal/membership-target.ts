import { z } from "zod";

import { membershipGenerationSchema } from "./schemas";
export const membershipScopeSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("parent"), familyId: z.string().uuid(), membershipId: z.string().uuid(), generation: membershipGenerationSchema }).strict(),
  z.object({ role: z.literal("staff"), membershipId: z.string().uuid(), generation: membershipGenerationSchema }).strict(),
]);
export type MembershipScope = z.infer<typeof membershipScopeSchema>;
type Profile = { id: string; email: string | null; generation: string };

export async function removeScopedMembership(
  scope: MembershipScope,
  confirmed: FormDataEntryValue | null,
  operations: {
    authorize: () => Promise<void>;
    parents: (familyId: string) => Promise<Profile[]>;
    staff: () => Promise<Profile[]>;
    revoke: (target: MembershipScope) => Promise<boolean>;
  },
): Promise<boolean> {
  await operations.authorize();
  const target = membershipScopeSchema.parse(scope);
  if (confirmed !== "yes") throw new Error("Confirmation required");
  const profiles = target.role === "parent" ? await operations.parents(target.familyId) : await operations.staff();
  if (!profiles.some((profile) => profile.id === target.membershipId && profile.email && profile.generation === target.generation)) return false;
  await operations.authorize();
  return operations.revoke(target);
}
