"use client";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestChangeAction, sendMessageAction } from "@/app/(portal)/(provider)/admin/messages/actions";
import { messageDraftKey } from "@/lib/portal/message-draft-state";
import { sameSession } from "@/lib/portal/session-binding";
import type { ActionActor } from "@/lib/portal/action-actor-state";
import { button, field } from "@/components/portal/invoices/format";
import { useMessageDrafts } from "./DraftProvider";

export function MessageComposer({ actor, role, targetId, kind = "message" }: { actor: ActionActor; role: "admin" | "parent" | "staff"; targetId: string; kind?: "message" | "request" }) {
 const clerk = useClerk(); const router = useRouter(); const { drafts, dispatch } = useMessageDrafts(); const [error,setError] = useState("");
 const [initialOperation, setInitialOperation] = useState(() => crypto.randomUUID());
 const key = messageDraftKey(role,kind,targetId);
 const draft = drafts[key] ?? { operationId: initialOperation, body: "", uncertain: false, pending: false };
 const current = () => sameSession({ userId: actor.userId, sessionId: actor.authSessionId }, clerk.session?.id, clerk.user?.id);
 async function send() {
  if (!current() || draft.pending || !draft.body.trim()) return;
  const submitted = { ...draft, uncertain: true, pending: true }; dispatch({ type: "set", key, draft: submitted }); setError("");
  try {
   const result = kind === "message" ? await sendMessageAction(actor, role, { familyId: targetId, operationId: submitted.operationId, body: submitted.body }) : await requestChangeAction(actor, { sessionId: targetId, operationId: submitted.operationId, body: submitted.body });
   if (!current()) return;
   if (!result.ok) { setError("Sending could not be confirmed. Retry the same details."); return; }
   dispatch({ type: "clear", key, operationId: submitted.operationId });
   setInitialOperation(crypto.randomUUID());
   router.refresh();
  } catch { if (current()) setError("Sending could not be confirmed. Retry the same details."); }
  finally { if (current()) dispatch({ type: "settle", key, operationId: submitted.operationId }); }
 }
 return <div className="border-t border-[#e3d7c3] p-5">
  <label className="block text-sm font-medium">{kind === "message" ? "Message" : "Reason for the request"}<textarea className={`${field} min-h-28`} maxLength={4000} value={draft.body} disabled={draft.pending || draft.uncertain} onChange={(event) => dispatch({ type: "set", key, draft: { ...draft, body: event.target.value } })} /></label>
  <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#35594a]">{draft.body.length} / 4,000 · Plain text</span><button type="button" className={button} disabled={draft.pending || !draft.body.trim()} onClick={() => void send()}>{draft.pending ? "Sending…" : draft.uncertain ? (kind === "message" ? "Retry message" : "Retry request") : kind === "message" ? "Send message" : "Submit request"}</button></div>
  {error && <p role="alert" className="mt-3 text-sm text-[#a12626]">{error}</p>}
 </div>;
}
