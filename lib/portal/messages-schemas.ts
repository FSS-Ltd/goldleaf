import { z } from "zod";
import { timestamp, uuid } from "./learning-schemas";

// PostgreSQL bigint is kept as decimal text across the JavaScript boundary.
export const messageSequence = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (value) =>
      /^[1-9]\d{0,18}$/.test(value) &&
      BigInt(value) <= BigInt("9223372036854775807"),
  );
export const messageInput = z
  .object({
    familyId: uuid,
    operationId: uuid,
    body: z.string().trim().min(1).max(4000),
  })
  .strict();
export const messageReadInput = z
  .object({ familyId: uuid, through: messageSequence })
  .strict();
export const messageRow = z.object({
  sequence: messageSequence,
  author_id: uuid,
  body: z.string(),
  created_at: timestamp,
});
export const unreadCount = z.string().regex(/^(0|[1-9]\d*)$/);
export type FamilyMessage = z.infer<typeof messageRow>;
export const changeRequestInput = z
  .object({
    sessionId: uuid,
    operationId: uuid,
    body: z.string().trim().min(1).max(4000),
  })
  .strict();
export const resolveRequestInput = z
  .object({
    requestId: uuid,
    resolution: z.string().trim().min(1).max(4000),
    newStart: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export const changeRequestRow = z.object({
  id: uuid,
  session_id: uuid,
  parent_id: uuid,
  body: z.string(),
  created_at: timestamp,
  resolved_at: timestamp.nullable(),
  resolution: z.string().nullable(),
});
export type SessionChangeRequest = z.infer<typeof changeRequestRow>;
