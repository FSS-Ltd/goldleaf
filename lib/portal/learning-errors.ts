import { z } from "zod";

export class LearningConflictError extends Error {
  constructor() {
    super("This content changed. Refresh and review it before saving or publishing.");
  }
}

export function translateLearningError(error: unknown): unknown {
  const conflict = z.object({ code: z.literal("40001"), message: z.enum(["note changed", "draft changed"]) }).safeParse(error);
  return conflict.success ? new LearningConflictError() : error;
}
