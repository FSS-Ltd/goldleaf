import { z } from "zod";

export const membershipGenerationSchema = z.string().regex(/^(0|[1-9][0-9]*)$/).max(19).refine((value) => value.length < 19 || value <= "9223372036854775807");

export const membershipSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("admin"), family_id: z.null() }),
  z.object({ role: z.literal("staff"), family_id: z.null() }),
  z.object({ role: z.literal("parent"), family_id: z.string().uuid() }),
]);
export const familySchema = z.object({ id: z.string().uuid(), display_name: z.string().nullable(), is_founding: z.boolean() });
export const familyMemberSchema = z.object({ id: z.string().uuid(), subject: z.string().min(1), role: z.enum(["admin", "parent", "staff"]), generation: membershipGenerationSchema });
export const staffSchema = z.object({ id: z.string().uuid(), subject: z.string().min(1), generation: membershipGenerationSchema });
export const familyInputSchema = z.object({ familyId: z.string().uuid(), name: z.string().trim().min(1).max(120), email: z.string().trim().max(254).pipe(z.email()), founding: z.boolean() }).strict();
export const familyFoundingInputSchema = z.object({ familyId: z.string().uuid(), founding: z.boolean() }).strict();
export const invitationInputSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), purpose: z.enum(["parent", "staff"]) }).strict();
export const idResultSchema = z.array(z.object({ id: z.string().uuid() })).length(1);
