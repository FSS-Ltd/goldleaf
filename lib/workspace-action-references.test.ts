import assert from "node:assert/strict";
import test from "node:test";
import { workspaceActionReferences, type WorkspaceActions } from "./portal/workspace-action-types";

function moduleLikeActions(): WorkspaceActions {
  const unavailable = async () => ({ ok: false as const, message: "Unavailable" });
  const actions = {
    updateSessionAction: unavailable,
    saveNoteAction: unavailable,
    saveDraftAction: unavailable,
    previewDraftAction: unavailable,
    publishDraftAction: unavailable,
  };
  Object.setPrototypeOf(actions, null);
  Object.defineProperty(actions, Symbol.toStringTag, { value: "Module" });
  return actions;
}

test("workspace clients receive a plain object preserving every server action reference", () => {
  const source = moduleLikeActions();
  const references = workspaceActionReferences(source);
  assert.equal(Object.getPrototypeOf(references), Object.prototype);
  assert.equal(Object.prototype.toString.call(references), "[object Object]");
  assert.deepEqual(Object.keys(references).sort(), Object.keys(source).sort());
  for (const key of Object.keys(source)) {
    assert.equal(Reflect.get(references, key), Reflect.get(source, key));
  }
});
