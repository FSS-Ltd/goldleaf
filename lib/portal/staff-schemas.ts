import { z } from "zod";

export const staffInvitationSchema = z.object({ email: z.string().trim().max(254).pipe(z.email()) }).strict();
export const staffAssignmentSchema = z.object({ staffId: z.string().uuid(), familyId: z.string().uuid(), enabled: z.boolean() }).strict();
export const staffFamilySchema = z.object({ id: z.string().uuid(), display_name: z.string().nullable() }).strict();
export const pendingStaffInvitationSchema = z.object({ id: z.string().uuid(), email: z.email(), expires_at: z.date().transform((value) => value.toISOString()) }).strict();
