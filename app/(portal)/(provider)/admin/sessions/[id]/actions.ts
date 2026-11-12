"use server";
import {
  updateSessionFor,
  saveNoteFor,
  saveDraftFor,
  previewDraftFor,
  publishDraftFor,
} from "@/lib/portal/workspace-actions";
export async function updateSessionAction(actor: unknown, input: unknown) {
  return updateSessionFor("admin", actor, input);
}
export async function saveNoteAction(actor: unknown, input: unknown) {
  return saveNoteFor("admin", actor, input);
}
export async function saveDraftAction(actor: unknown, input: unknown) {
  return saveDraftFor("admin", actor, input);
}
export async function previewDraftAction(actor: unknown, input: unknown) {
  return previewDraftFor("admin", actor, input);
}
export async function publishDraftAction(actor: unknown, input: unknown) {
  return publishDraftFor("admin", actor, input);
}
