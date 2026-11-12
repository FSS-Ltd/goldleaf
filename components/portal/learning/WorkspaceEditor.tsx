"use client";

import { useState, useTransition } from "react";
import type { ActionActor } from "@/lib/portal/action-actor";
import type { WorkspaceActions } from "@/lib/portal/workspace-action-types";
import type {
  LearningPreview,
  LearningWorkspace,
} from "@/lib/portal/learning-schemas";
import { ParentUpdateFields, type DraftFields } from "./ParentUpdateFields";
import { ParentUpdatePreview } from "./ParentUpdatePreview";

const button =
  "min-h-12 rounded-lg border border-[#06451d] px-4 py-2 text-sm disabled:opacity-50";
const textValue = (value: string | null) => value ?? "";

export function WorkspaceEditor({
  sessionId,
  actor,
  actions,
  sessionWhen,
  childName,
  familyName,
  initial,
  operationId,
}: {
  sessionId: string;
  actor: ActionActor;
  actions: WorkspaceActions;
  sessionWhen: string;
  childName: string;
  familyName: string;
  initial: LearningWorkspace;
  operationId: string;
}) {
  const [body, setBody] = useState(textValue(initial.draft));
  const [stage, setStage] = useState(
    initial.stage === null ? "" : String(initial.stage),
  );
  const [focus, setFocus] = useState(textValue(initial.focus));
  const [practice, setPractice] = useState(textValue(initial.practice));
  const [sounds, setSounds] = useState(initial.explored_sounds.join("\n"));
  const [version, setVersion] = useState(initial.draft_version);
  const [savedDraft, setSavedDraft] = useState(
    JSON.stringify([
      textValue(initial.draft),
      initial.stage === null ? "" : String(initial.stage),
      textValue(initial.focus),
      textValue(initial.practice),
      initial.explored_sounds.join("\n"),
    ]),
  );
  const [preview, setPreview] = useState<LearningPreview | null>(null);
  const [operation, setOperation] = useState(operationId);
  const [draftMessage, setDraftMessage] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"save" | "preview" | "share" | null>(null);
  function run(phase: "save" | "preview" | "share", task: () => Promise<void>) {
    setPhase(phase);
    start(async () => {
      try {
        await task();
      } catch {
        setDraftMessage("Connection interrupted. Please retry this action.");
      } finally {
        setPhase(null);
      }
    });
  }
  const current = JSON.stringify([body, stage, focus, practice, sounds]);
  const dirty = current !== savedDraft;
  function changed(setter: (value: string) => void, value: string) {
    setter(value);
    setPreview(null);
    setPublishedAt("");
    setDraftMessage("");
  }
  function saveDraft() {
    setDraftMessage("");
    const normalBody = body.trim();
    const normalSounds = [
      ...new Set(
        sounds
          .split("\n")
          .map((sound) => sound.trim())
          .filter(Boolean),
      ),
    ].join("\n");
    run("save", async () => {
      const result = await actions.saveDraftAction(actor, {
        sessionId,
        body: normalBody,
        stage: stage === "" ? null : Number(stage),
        focus: focus || null,
        practice: practice || null,
        exploredSounds: normalSounds ? normalSounds.split("\n") : [],
        expectedVersion: version,
      });
      if (!result.ok) return setDraftMessage(result.message);
      setBody(normalBody);
      setSounds(normalSounds);
      setVersion(result.version);
      setSavedDraft(
        JSON.stringify([normalBody, stage, focus, practice, normalSounds]),
      );
      setPreview(null);
      setDraftMessage("Saved");
    });
  }
  function previewDraft() {
    setDraftMessage("");
    run("preview", async () => {
      const result = await actions.previewDraftAction(actor, {
        sessionId,
        expectedVersion: version,
      });
      if (!result.ok) return setDraftMessage(result.message);
      setPreview(result.preview);
      setOperation(crypto.randomUUID());
    });
  }
  function publish() {
    if (!preview) return;
    setDraftMessage("");
    run("share", async () => {
      const result = await actions.publishDraftAction(actor, {
        sessionId,
        expectedVersion: preview.version,
        fingerprint: preview.fingerprint,
        operationId: operation,
      });
      if (!result.ok) return setDraftMessage(result.message);
      setPublishedAt(result.publishedAt);
      setPreview(null);
      setDraftMessage("Shared with family");
    });
  }
  return (
    <div className="space-y-6">
      <section
        id="parent-update"
        className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6"
      >
        <h2 className="!text-xl">Parent update</h2>
        <p className="mt-2 text-sm font-medium">
          Draft · visible to authorised staff until shared
        </p>
        <p className="mt-2 text-sm">
          Authorised parents can view the family record for {childName}.
        </p>
        <ParentUpdateFields
          values={{ body, stage, focus, practice, sounds }}
          pending={pending}
          onChange={(key: keyof DraftFields, value: string) => {
            const setters = {
              body: setBody,
              stage: setStage,
              focus: setFocus,
              practice: setPractice,
              sounds: setSounds,
            };
            changed(setters[key], value);
          }}
        />
        <p className="mt-2 text-sm">
          {dirty ? "Unsaved" : version ? "Saved" : "No draft yet"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={button}
            disabled={pending || !dirty || !body.trim()}
            onClick={saveDraft}
          >
            {pending && phase === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            className={button}
            disabled={pending || dirty || !version || !body.trim() || !!preview}
            onClick={previewDraft}
          >
            {pending && phase === "preview" ? "Preparing…" : "Preview update"}
          </button>
        </div>
        {draftMessage && (
          <p
            role={publishedAt || draftMessage === "Saved" ? "status" : "alert"}
            className="mt-3 text-sm"
          >
            {draftMessage}
            {publishedAt &&
              ` · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(publishedAt))}`}
          </p>
        )}
        {preview && (
          <ParentUpdatePreview
            preview={preview}
            sessionWhen={sessionWhen}
            childName={childName}
            familyName={familyName}
            pending={pending}
            sharing={pending && phase === "share"}
            onShare={publish}
          />
        )}
      </section>
    </div>
  );
}
