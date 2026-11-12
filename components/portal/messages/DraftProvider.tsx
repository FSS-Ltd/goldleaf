"use client";
import { createContext, useContext, useReducer, type ReactNode } from "react";
import { messageDraftReducer, type DraftAction, type MessageDraft } from "@/lib/portal/message-draft-state";
const DraftContext = createContext<{ drafts: Record<string, MessageDraft>; dispatch: (action: DraftAction) => void } | null>(null);
export function DraftProvider({ children }: { children: ReactNode }) {
 const [drafts, dispatch] = useReducer(messageDraftReducer, {});
 return <DraftContext.Provider value={{ drafts, dispatch }}>{children}</DraftContext.Provider>;
}
export function useMessageDrafts() { const context = useContext(DraftContext); if (!context) throw new Error("Draft provider missing"); return context; }
