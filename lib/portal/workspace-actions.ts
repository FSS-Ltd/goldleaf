import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionActor } from "@/lib/portal/action-actor";
import { changeSession, readScopedSession } from "@/lib/portal/sessions";
import {
  listPublishedLearning,
  previewLearningDraft,
  publishLearningDraft,
  saveLearningDraft,
  savePrivateNote,
} from "@/lib/portal/learning";
import { LearningConflictError } from "@/lib/portal/learning-errors";

function message(error: unknown) {
  return error instanceof LearningConflictError
    ? error.message
    : "Could not complete this action. Check your details and try again.";
}
function refresh(sessionId: string) {
  revalidatePath(`/staff/sessions/${sessionId}`);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath(`/parent/sessions/${sessionId}`);
  revalidatePath("/admin/children");
  revalidatePath("/staff/sessions");
  revalidatePath("/staff");
  revalidatePath("/parent");
  revalidatePath("/parent/sessions");
  revalidatePath("/parent/learning");
}
export async function updateSessionFor(
  role: "admin" | "staff",
  actor: unknown,
  input: unknown,
) {
  try {
    await requireActionActor(actor, role);
    const value = z
      .object({
        sessionId: z.string().uuid(),
        status: z.enum(["in_progress", "completed", "cancelled"]).nullable(),
        attendance: z.enum(["present", "absent", "not_recorded"]).nullable(),
      })
      .strict()
      .parse(input);
    await changeSession(value);
    refresh(value.sessionId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
export async function saveNoteFor(
  role: "admin" | "staff",
  actor: unknown,
  input: unknown,
) {
  try {
    await requireActionActor(actor, role);
    const version = await savePrivateNote(input);
    return { ok: true as const, version };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
export async function saveDraftFor(
  role: "admin" | "staff",
  actor: unknown,
  input: unknown,
) {
  try {
    await requireActionActor(actor, role);
    const version = await saveLearningDraft(input);
    return { ok: true as const, version };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
export async function previewDraftFor(
  role: "admin" | "staff",
  actor: unknown,
  input: unknown,
) {
  try {
    await requireActionActor(actor, role);
    const preview = await previewLearningDraft(input);
    return { ok: true as const, preview };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
export async function publishDraftFor(
  role: "admin" | "staff",
  actor: unknown,
  input: unknown,
) {
  try {
    await requireActionActor(actor, role);
    const value = z
      .object({
        sessionId: z.string().uuid(),
        expectedVersion: z.number().int().positive(),
        operationId: z.string().uuid(),
        fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .strict()
      .parse(input);
    const session = await readScopedSession(value.sessionId, role);
    if (!session) throw new Error("Unavailable");
    const publication = await publishLearningDraft(value);
    const update = (
      await listPublishedLearning(session.family_id, session.child_id)
    ).find((item) => item.id === publication);
    if (!update) throw new Error("Publication unavailable");
    refresh(value.sessionId);
    return { ok: true as const, publishedAt: update.published_at };
  } catch (error) {
    return { ok: false as const, message: message(error) };
  }
}
