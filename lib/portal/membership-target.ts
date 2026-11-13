import { z } from "zod";

const targetSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("parent"), familyId: z.string().uuid(), membershipId: z.string().uuid() }),
  z.object({ role: z.literal("staff"), membershipId: z.string().uuid() }),
]);
export type MembershipScope = z.infer<typeof targetSchema>;
type Profile = { id: string; email: string | null };

export async function removeScopedMembership(
  scope: MembershipScope,
  confirmed: FormDataEntryValue | null,
  operations: {
    authorize: () => Promise<void>;
    parents: (familyId: string) => Promise<Profile[]>;
    staff: () => Promise<Profile[]>;
    revoke: (membershipId: string) => Promise<void>;
  },
): Promise<boolean> {
  await operations.authorize();
  const target = targetSchema.parse(scope);
  if (confirmed !== "yes") throw new Error("Confirmation required");
  const profiles = target.role === "parent" ? await operations.parents(target.familyId) : await operations.staff();
  if (!profiles.some((profile) => profile.id === target.membershipId && profile.email)) return false;
  await operations.authorize();
  await operations.revoke(target.membershipId);
  return true;
}
