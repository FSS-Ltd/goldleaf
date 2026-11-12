export type MessageDraft = { operationId: string; body: string; uncertain: boolean; pending: boolean };
export type DraftAction = { type: "set"; key: string; draft: MessageDraft } | { type: "clear"; key: string; operationId: string } | { type: "settle"; key: string; operationId: string };
export function messageDraftReducer(state: Record<string, MessageDraft>, action: DraftAction): Record<string, MessageDraft> {
 if (action.type === "set") return { ...state, [action.key]: action.draft };
 if (state[action.key]?.operationId !== action.operationId) return state;
 if (action.type === "settle") return { ...state, [action.key]: { ...state[action.key], pending: false } };
 const next = { ...state }; delete next[action.key]; return next;
}
export function messageDraftKey(role: string, kind: "message" | "request", targetId: string): string { return `${role}:${kind}:${targetId}`; }
