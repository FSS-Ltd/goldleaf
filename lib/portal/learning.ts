import "server-only";
import { z } from "zod";
import { stages } from "@/content/progression";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { translateLearningError } from "./learning-errors";
import { draftInput, intResult, noteInput, publishInput, previewRow, publishedRow, uuid, uuidResult, workspaceRow, type LearningWorkspace, type LearningPreview, type PublishedLearningUpdate } from "./learning-schemas";

export { stages };
export async function readLearningWorkspace(sessionId: unknown): Promise<LearningWorkspace> {
  const session = uuid.parse(sessionId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(workspaceRow).length(1).parse(await sql`SELECT * FROM portal.learning_workspace(${userId},${session})`)[0];
}
export async function savePrivateNote(input: unknown): Promise<number> {
  const value = noteInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  try {
    return intResult.parse(await sql`SELECT portal.save_private_note(${userId},${value.sessionId},${value.body},${value.expectedVersion}) AS result`)[0].result;
  } catch (error) {
    throw translateLearningError(error);
  }
}
export async function saveLearningDraft(input: unknown): Promise<number> {
  const value = draftInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  try {
    return intResult.parse(await sql`SELECT portal.save_learning_draft(${userId},${value.sessionId},${value.body},${value.stage}::smallint,${value.focus},${value.practice},${value.exploredSounds}::text[],${value.expectedVersion}) AS result`)[0].result;
  } catch (error) {
    throw translateLearningError(error);
  }
}
export async function previewLearningDraft(input: unknown): Promise<LearningPreview> {
  const value = z.object({ sessionId: uuid, expectedVersion: z.number().int().positive() }).strict().parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  try {
    return z.array(previewRow).length(1).parse(await sql`SELECT * FROM portal.preview_learning_draft(${userId},${value.sessionId},${value.expectedVersion})`)[0];
  } catch (error) {
    throw translateLearningError(error);
  }
}
export async function publishLearningDraft(input: unknown): Promise<string> {
  const value = publishInput.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  try {
    return uuidResult.parse(await sql`SELECT portal.publish_learning_draft(${userId},${value.sessionId},${value.expectedVersion},${value.operationId},${value.fingerprint}) AS result`)[0].result;
  } catch (error) {
    throw translateLearningError(error);
  }
}
export async function listPublishedLearning(familyId: unknown, childId: unknown): Promise<PublishedLearningUpdate[]> {
  const family = uuid.parse(familyId);
  const child = uuid.parse(childId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(publishedRow).parse(await sql`SELECT * FROM portal.list_published_learning(${userId},${family},${child})`);
}

/** Latest published update per child across this parent's active families. */
export async function listParentLatestLearning(): Promise<PublishedLearningUpdate[]> {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(publishedRow).parse(await sql`SELECT * FROM portal.list_parent_latest_learning(${userId})`);
}
