"use client";

import { useState, useTransition } from "react";
import type { ActionActor } from "@/lib/portal/action-actor";
import type { WorkspaceActions } from "@/lib/portal/workspace-action-types";

export function PrivateNoteEditor({
  sessionId,
  actor,
  actions,
  note,
  version,
}: {
  sessionId: string;
  actor: ActionActor;
  actions: WorkspaceActions;
  note: string | null;
  version: number;
}) {
  const [body, setBody] = useState(note ?? "");
  const [saved, setSaved] = useState(note ?? "");
  const [savedVersion, setSavedVersion] = useState(version);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  function save() {
    setError("");
    start(async () => {
      try {
        const result = await actions.saveNoteAction(actor, {
          sessionId,
          body,
          expectedVersion: savedVersion,
        });
        if (!result.ok) return setError(result.message);
        setSavedVersion(result.version);
        setSaved(body);
      } catch {
        setError("Connection interrupted. Please retry saving.");
      }
    });
  }
  return (
    <section
      id="private-note"
      className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6"
    >
      <h2 className="!text-xl">Private staff note</h2>
      <p className="mt-2 text-sm">Visible to authorised staff only.</p>
      <label className="mt-4 block text-sm font-medium">
        Private note
        <textarea
          className="mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3"
          rows={5}
          value={body}
          maxLength={10000}
          disabled={pending}
          onChange={(event) => {
            setBody(event.target.value);
            setError("");
          }}
        />
      </label>
      <p className="mt-2 text-sm">
        {body !== saved ? "Unsaved" : savedVersion ? "Saved" : "No note yet"}
      </p>
      <button
        className="mt-3 min-h-12 rounded-lg border border-[#06451d] px-4 py-2 text-sm disabled:opacity-50"
        disabled={pending || body === saved}
        onClick={save}
      >
        {pending ? "Saving…" : "Save private note"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
