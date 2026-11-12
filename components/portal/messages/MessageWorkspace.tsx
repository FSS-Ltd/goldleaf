import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/portal/require-role";
import { listMessageAuthors, listMessageFamilies, listMessageRequestContexts, listMessageSessions, readMessageThread } from "@/lib/portal/message-views";
import { AdminRequests } from "./AdminRequests";
import { Conversation } from "./Conversation";
import { ParentRequests } from "./ParentRequests";
import { DraftProvider } from "./DraftProvider";

export async function MessageWorkspace({ role, family, view }: { role: "admin" | "parent" | "staff"; family?: string; view?: string }) {
 const { identity, memberships } = await requireRole(role);
 const { sessionId } = await auth(); if (!sessionId) redirect("/sign-in");
 const actor = { userId: identity.userId, authSessionId: sessionId };
 const families = await listMessageFamilies(role);
 const selected = family === undefined ? families[0] : (z.string().uuid().safeParse(family).success ? families.find((item) => item.id === family) : undefined);
 const isRequests = role === "admin" && view === "requests";
 const [messages, authors, sessions, requests] = await Promise.all([
  selected && !isRequests ? readMessageThread(role, selected.id) : [],
  selected && !isRequests ? listMessageAuthors(selected.id, role) : [],
  selected && role === "parent" ? listMessageSessions(selected.id, role) : [],
  role === "admin" || role === "parent" ? listMessageRequestContexts(role) : [],
 ]);
 const base = `/${role}/messages`;
 return <PortalShell role={role} userId={identity.userId} memberships={memberships}>
  <DraftProvider key={`${actor.userId}:${actor.authSessionId}:${role}`}><div className="space-y-6"><div><h1 className="!text-[clamp(2rem,4vw,2.6rem)]">Messages</h1><p className="mt-2 text-sm text-[#35594a]">Conversations with your Goldleaf community.</p></div>
   {role === "admin" && <nav aria-label="Messages sections" className="flex flex-wrap gap-3 text-sm"><Link href={base} aria-current={!isRequests ? "page" : undefined} className={`rounded-lg px-4 py-3 ${!isRequests ? "bg-[#ecd081]" : "bg-[#f6eee2]"}`}>Conversations</Link><Link href={`${base}?view=requests`} aria-current={isRequests ? "page" : undefined} className={`rounded-lg px-4 py-3 ${isRequests ? "bg-[#ecd081]" : "bg-[#f6eee2]"}`}>Session requests</Link></nav>}
   {isRequests ? <AdminRequests actor={actor} requests={requests} /> : families.length === 0 ? <div className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6"><h2 className="!text-xl">No conversations available</h2><p className="mt-2 text-sm">{role === "admin" ? "Create a family to start a conversation." : "Conversations appear here when a family is available to you."}</p>{role === "admin" && <Link href="/admin" className="mt-4 inline-block min-h-12 text-sm underline">Create a family</Link>}</div> : !selected ? <p role="alert">This conversation is not available.</p> : <>
    {families.length > 1 && <nav aria-label="Families" className="flex flex-wrap gap-2">{families.map((item) => <Link key={item.id} href={`${base}?family=${item.id}`} aria-current={item.id === selected.id ? "page" : undefined} className={`min-h-12 rounded-lg px-4 py-3 text-sm ${item.id === selected.id ? "bg-[#ecd081]" : "bg-[#f6eee2]"}`}>{item.display_name ?? "Family"}{item.unread !== "0" && ` · ${item.unread} unread`}</Link>)}</nav>}
    <div className={role === "parent" ? "grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}><Conversation key={selected.id} actor={actor} role={role} familyId={selected.id} familyName={selected.display_name ?? "Family"} messages={messages} authors={authors} />{role === "parent" && <ParentRequests actor={actor} sessions={sessions} requests={requests.filter((request) => request.family_id === selected.id)} />}</div>
   </>}
  </div></DraftProvider>
 </PortalShell>;
}
