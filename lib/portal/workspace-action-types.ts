import type * as actions from "@/app/(portal)/(provider)/staff/sessions/[id]/actions";
export type WorkspaceActions = {
  updateSessionAction: typeof actions.updateSessionAction;
  saveNoteAction: typeof actions.saveNoteAction;
  saveDraftAction: typeof actions.saveDraftAction;
  previewDraftAction: typeof actions.previewDraftAction;
  publishDraftAction: typeof actions.publishDraftAction;
};

export function workspaceActionReferences(actions: WorkspaceActions): WorkspaceActions {
  return {
    updateSessionAction: actions.updateSessionAction,
    saveNoteAction: actions.saveNoteAction,
    saveDraftAction: actions.saveDraftAction,
    previewDraftAction: actions.previewDraftAction,
    publishDraftAction: actions.publishDraftAction,
  };
}
