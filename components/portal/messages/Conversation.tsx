"use client";
import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { markMessageAction } from "@/app/(portal)/(provider)/admin/messages/actions";
import { sameSession } from "@/lib/portal/session-binding";
import type { ActionActor } from "@/lib/portal/action-actor-state";
import type { FamilyMessage } from "@/lib/portal/messages-schemas";
import type { MessageAuthor } from "@/lib/portal/message-views";
import { MessageComposer } from "./MessageComposer";

export function Conversation({ actor, role, familyId, familyName, messages, authors }: { actor: ActionActor; role: "admin" | "parent" | "staff"; familyId: string; familyName: string; messages: FamilyMessage[]; authors: MessageAuthor[] }) {
 const clerk = useClerk(); const list = useRef<HTMLUListElement>(null); const marked = useRef("0"); const pending = useRef(new Set<string>());
 useEffect(() => {
  const root = list.current;
  if (!root || typeof IntersectionObserver === "undefined") return;
  let active = true;
  const observer = new IntersectionObserver((entries) => {
   const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.getAttribute("data-sequence")).filter((sequence): sequence is string => sequence !== null);
   const sequence = visible.reduce<string | null>((highest, value) => highest === null || BigInt(value) > BigInt(highest) ? value : highest, null);
   if (!sequence || BigInt(sequence) <= BigInt(marked.current) || pending.current.has(sequence)) return;
   if (!sameSession({ userId: actor.userId, sessionId: actor.authSessionId }, clerk.session?.id, clerk.user?.id)) return;
   pending.current.add(sequence);
   void markMessageAction(actor, role, { familyId, through: sequence }).then((ok) => {
    pending.current.delete(sequence);
    if (ok && active && sameSession({ userId: actor.userId, sessionId: actor.authSessionId }, clerk.session?.id, clerk.user?.id) && BigInt(sequence) > BigInt(marked.current)) marked.current = sequence;
   });
  }, { threshold: 0.5 });
  root.querySelectorAll("[data-sequence]").forEach((item) => observer.observe(item));
  return () => { active = false; observer.disconnect(); };
 }, [actor, role, familyId, messages, clerk]);
 return <section className="overflow-hidden rounded-[14px] border border-[#e3d7c3] bg-[#fef8f3]" aria-labelledby="conversation-title">
  <div className="border-b border-[#e3d7c3] bg-[#f6eee2] p-5"><h2 id="conversation-title" className="!text-xl">{familyName} conversation</h2><p className="mt-2 text-sm text-[#35594a]">Shared with current parents, assigned staff and administrators.</p></div>
  {messages.length === 0 ? <p className="p-8 text-sm text-[#35594a]">No messages yet. Start the conversation below.</p> : <ul ref={list} className="space-y-5 p-5">{messages.map((message) => { const author = authors.find((item) => item.id === message.author_id); return <li key={message.sequence} data-sequence={message.sequence} className={`flex ${author?.own ? "justify-end" : "justify-start"}`}><div className="max-w-[85%]"><p className="mb-1 text-xs text-[#35594a]">{author?.own ? "You" : author?.name ?? "Member"} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(message.created_at))}</p><p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${author?.own ? "bg-[#06451d] text-white" : "bg-[#f6eee2] text-[#1b3022]"}`}>{message.body}</p></div></li>; })}</ul>}
  <MessageComposer key={familyId} actor={actor} role={role} targetId={familyId} />
 </section>;
}
