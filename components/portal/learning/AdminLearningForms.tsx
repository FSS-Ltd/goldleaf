"use client";

import { useActionState } from "react";
import { createSession, registerChild, type AdminActionState } from "@/app/(portal)/(provider)/admin/children/actions";
import type { Child } from "@/lib/portal/learning-schemas";

const initial: AdminActionState = { status: "idle", message: "" };
const input = "mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3";
const button = "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm text-white disabled:opacity-50";
function Feedback({ state }: { state: AdminActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p> : null;
}

export function RegisterChildForm({ familyId, requestId }: { familyId: string; requestId: string }) {
  const [state, action, pending] = useActionState(registerChild, initial);
  return <form action={action} className="mt-5 space-y-4">
    <input type="hidden" name="id" value={requestId} />
    <input type="hidden" name="familyId" value={familyId} />
    <label className="block text-sm font-medium">Child’s display name<input className={input} name="name" maxLength={120} required /></label>
    <button className={button} disabled={pending}>{pending ? "Saving…" : "Register child"}</button>
    <Feedback state={state} />
  </form>;
}

export function ScheduleSessionForm({ children, requestId }: { children: Child[]; requestId: string }) {
  const [state, action, pending] = useActionState(createSession, initial);
  return <form action={action} className="mt-5 space-y-4">
    <input type="hidden" name="id" value={requestId} />
    <label className="block text-sm font-medium">Child<select className={input} name="childId" required defaultValue=""><option value="" disabled>Select a child</option>{children.map((child) => <option key={child.id} value={child.id}>{child.display_name}</option>)}</select></label>
    <label className="block text-sm font-medium">Date<input className={input} name="date" type="date" required /></label>
    <label className="block text-sm font-medium">UK start time<input className={input} name="time" type="time" required /></label>
    <label className="block text-sm font-medium">Location <span className="font-normal">(optional)</span><input className={input} name="location" maxLength={200} /></label>
    <p className="text-sm text-[#35594a]">Sessions last two hours.</p>
    <button className={button} disabled={pending || children.length === 0}>{pending ? "Scheduling…" : "Schedule session"}</button>
    <Feedback state={state} />
  </form>;
}
