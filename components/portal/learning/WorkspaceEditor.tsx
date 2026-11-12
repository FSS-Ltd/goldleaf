"use client";

import { useState, useTransition } from "react";
import { previewDraftAction, publishDraftAction, saveDraftAction, saveNoteAction } from "@/app/(portal)/(provider)/staff/sessions/[id]/actions";
import type { LearningPreview, LearningWorkspace } from "@/lib/portal/learning-schemas";
import { RecordedSoundChips } from "@/components/SoundTiles";

const field = "mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3";
const button = "min-h-12 rounded-lg border border-[#06451d] px-4 py-2 text-sm disabled:opacity-50";
const textValue = (value: string | null) => value ?? "";

export function WorkspaceEditor({ sessionId, childName, familyName, initial, operationId }: { sessionId: string; childName: string; familyName: string; initial: LearningWorkspace; operationId: string }) {
  const [note, setNote] = useState(textValue(initial.note));
  const [savedNote, setSavedNote] = useState(textValue(initial.note));
  const [noteVersion, setNoteVersion] = useState(initial.note_version);
  const [body, setBody] = useState(textValue(initial.draft));
  const [stage, setStage] = useState(initial.stage === null ? "" : String(initial.stage));
  const [focus, setFocus] = useState(textValue(initial.focus));
  const [practice, setPractice] = useState(textValue(initial.practice));
  const [sounds, setSounds] = useState(initial.explored_sounds.join("\n"));
  const [version, setVersion] = useState(initial.draft_version);
  const [savedDraft, setSavedDraft] = useState(JSON.stringify([textValue(initial.draft), initial.stage === null ? "" : String(initial.stage), textValue(initial.focus), textValue(initial.practice), initial.explored_sounds.join("\n")]));
  const [preview, setPreview] = useState<LearningPreview | null>(null);
  const [operation, setOperation] = useState(operationId);
  const [noteMessage, setNoteMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [pending, start] = useTransition();
  const current = JSON.stringify([body, stage, focus, practice, sounds]);
  const dirty = current !== savedDraft;
  function changed(setter: (value: string) => void, value: string) {
    setter(value);
    setPreview(null);
    setPublishedAt("");
    setDraftMessage("");
  }
  function saveNote() {
    setNoteMessage("");
    start(async () => {
      const result = await saveNoteAction({ sessionId, body: note, expectedVersion: noteVersion });
      if (!result.ok) return setNoteMessage(result.message);
      setNoteVersion(result.version);
      setSavedNote(note);
      setNoteMessage("Saved");
    });
  }
  function saveDraft() {
    setDraftMessage("");
    start(async () => {
      const result = await saveDraftAction({ sessionId, body, stage: stage === "" ? null : Number(stage), focus: focus || null, practice: practice || null, exploredSounds: sounds.split("\n").map((sound) => sound.trim()).filter(Boolean), expectedVersion: version });
      if (!result.ok) return setDraftMessage(result.message);
      setVersion(result.version);
      setSavedDraft(current);
      setPreview(null);
      setDraftMessage("Saved");
    });
  }
  function previewDraft() {
    setDraftMessage("");
    start(async () => {
      const result = await previewDraftAction({ sessionId, expectedVersion: version });
      if (!result.ok) return setDraftMessage(result.message);
      setPreview(result.preview);
      setOperation(crypto.randomUUID());
    });
  }
  function publish() {
    if (!preview) return;
    setDraftMessage("");
    start(async () => {
      const result = await publishDraftAction({ sessionId, expectedVersion: preview.version, fingerprint: preview.fingerprint, operationId: operation });
      if (!result.ok) return setDraftMessage(result.message);
      setPublishedAt(result.publishedAt);
      setPreview(null);
      setDraftMessage("Shared with family");
    });
  }
  return <div className="space-y-6">
    <section id="private-note" className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
      <h2 className="!text-xl">Private staff note</h2><p className="mt-2 text-sm">Visible to authorised staff only.</p>
      <label className="mt-4 block text-sm font-medium">Private note<textarea className={field} rows={5} value={note} maxLength={10000} disabled={pending} onChange={(event) => { setNote(event.target.value); setNoteMessage(""); }} /></label>
      <p className="mt-2 text-sm">{note !== savedNote ? "Unsaved" : noteMessage || (noteVersion ? "Saved" : "No note yet")}</p>
      <button className={`${button} mt-3`} disabled={pending || note === savedNote} onClick={saveNote}>{pending ? "Saving…" : "Save private note"}</button>
      {noteMessage && noteMessage !== "Saved" && <p role="alert" className="mt-2 text-sm">{noteMessage}</p>}
    </section>
    <section id="parent-update" className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6">
      <h2 className="!text-xl">Parent update</h2><p className="mt-2 text-sm">Authorised parents can view the family record for {childName}.</p>
      <label className="mt-4 block text-sm font-medium">Update<textarea className={field} rows={5} value={body} maxLength={10000} disabled={pending} onChange={(event) => changed(setBody, event.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Stage (optional)<select className={field} value={stage} disabled={pending} onChange={(event) => changed(setStage, event.target.value)}><option value="">Not recorded</option>{[0, 1, 2, 3, 4].map((item) => <option value={item} key={item}>Stage {item}</option>)}</select></label>
      <label className="mt-4 block text-sm font-medium">Focus (optional)<textarea className={field} rows={2} value={focus} maxLength={1000} disabled={pending} onChange={(event) => changed(setFocus, event.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Practice (optional)<textarea className={field} rows={2} value={practice} maxLength={1000} disabled={pending} onChange={(event) => changed(setPractice, event.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Sounds explored (optional, one per line)<textarea className={field} rows={3} value={sounds} disabled={pending} onChange={(event) => changed(setSounds, event.target.value)} /></label>
      <p className="mt-2 text-sm">{dirty ? "Unsaved" : version ? "Saved" : "No draft yet"}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={pending || !dirty || !body.trim()} onClick={saveDraft}>{pending ? "Saving…" : "Save draft"}</button><button className={button} disabled={pending || dirty || !version || !body.trim()} onClick={previewDraft}>Preview update</button></div>
      {draftMessage && <p role={publishedAt ? "status" : "alert"} className="mt-3 text-sm">{draftMessage}{publishedAt && ` · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(publishedAt))}`}</p>}
      {preview && <div className="mt-6 rounded-lg border border-[#d6c8b5] bg-white p-4"><h3 className="font-medium">Preview for {familyName}</h3><p className="mt-2 text-sm">{childName} · Authorised parents can view this in the family record.</p><p className="mt-4 whitespace-pre-wrap">{preview.body}</p>{preview.stage !== null && <p className="mt-3">Stage {preview.stage}</p>}{preview.focus && <p className="mt-3">{preview.focus}</p>}{preview.practice && <p className="mt-3">{preview.practice}</p>}{preview.explored_sounds.length > 0 && <div className="mt-3"><p>Sounds explored</p><RecordedSoundChips sounds={preview.explored_sounds} /></div>}<button className={`${button} mt-5`} disabled={pending} onClick={publish}>{pending ? "Sharing…" : `Share with ${familyName}`}</button></div>}
    </section>
  </div>;
}
