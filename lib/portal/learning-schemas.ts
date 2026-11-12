import { z } from "zod";

export const uuid = z.string().uuid();
export const version = z.number().int().nonnegative();
export const timestamp = z.union([z.date(), z.iso.datetime({ offset: true })])
  .transform((value) => value instanceof Date ? value.toISOString() : value);

export const childInput = z.object({
  id: uuid,
  familyId: uuid,
  name: z.string().trim().min(1).max(120),
}).strict();
export const childRow = z.object({ id: uuid, family_id: uuid, display_name: z.string().min(1).max(120) });
export const sessionInput = z.object({
  id: uuid,
  childId: uuid,
  startsAt: z.iso.datetime({ offset: true }),
  locationLabel: z.string().trim().min(1).max(200).nullable().default(null),
}).strict();
export const sessionChange = z.object({
  sessionId: uuid,
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).nullable(),
  attendance: z.enum(["not_recorded", "present", "absent"]).nullable(),
}).strict().refine((value) => value.status !== null || value.attendance !== null);
export const sessionRow = z.object({
  id: uuid,
  child_id: uuid,
  family_id: uuid,
  starts_at: timestamp,
  duration_minutes: z.number().int().positive(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  attendance: z.enum(["not_recorded", "present", "absent"]),
  location_label: z.string().min(1).max(200).nullable(),
});
export const noteInput = z.object({
  sessionId: uuid,
  body: z.string().max(10000),
  expectedVersion: version,
}).strict();
export const draftInput = z.object({
  sessionId: uuid,
  body: z.string().trim().min(1).max(10000),
  stage: z.number().int().min(0).max(4).nullable(),
  focus: z.string().max(1000).nullable(),
  practice: z.string().max(1000).nullable(),
  expectedVersion: version,
}).strict();
export const publishInput = z.object({
  sessionId: uuid,
  expectedVersion: version.refine((n) => n > 0),
  operationId: uuid,
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
export const workspaceRow = z.object({
  note: z.string().nullable(),
  note_version: version,
  draft: z.string().nullable(),
  draft_version: version,
  stage: z.number().int().min(0).max(4).nullable(),
  focus: z.string().nullable(),
  practice: z.string().nullable(),
});
export const previewRow = z.object({
  body: z.string(),
  stage: z.number().int().min(0).max(4).nullable(),
  focus: z.string().nullable(),
  practice: z.string().nullable(),
  version,
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
});
export const publishedRow = z.object({
  id: uuid,
  session_id: uuid,
  child_id: uuid,
  family_id: uuid,
  body: z.string(),
  stage: z.number().int().min(0).max(4).nullable(),
  focus: z.string().nullable(),
  practice: z.string().nullable(),
  published_at: timestamp,
  published_by: uuid,
});
export const intResult = z.array(z.object({ result: version })).length(1);
export const uuidResult = z.array(z.object({ result: uuid })).length(1);

export type Child = z.infer<typeof childRow>;
export type Session = z.infer<typeof sessionRow>;
export type LearningWorkspace = z.infer<typeof workspaceRow>;
export type LearningPreview = z.infer<typeof previewRow>;
export type PublishedLearningUpdate = z.infer<typeof publishedRow>;
