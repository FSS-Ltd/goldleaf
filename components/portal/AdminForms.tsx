"use client";

import { useActionState, type ReactNode } from "react";
import { changeFounding, createFamily, resendInvitation, revokeInvitation, type AdminActionState } from "@/app/(portal)/(provider)/admin/actions";

const initial: AdminActionState = { status: "idle", message: "" };
const field = "mt-2 min-h-12 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3 text-[#1d1b19] focus:outline-2 focus:outline-offset-2 focus:outline-[#06451d]";
const button = "min-h-11 rounded-lg bg-[#06451d] px-5 py-3 text-sm font-medium text-white disabled:opacity-60";

function Feedback({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 text-sm ${state.status === "error" ? "text-red-800" : "text-[#06451d]"}`}>{state.message}</p>;
}

export function CreateFamilyForm({ familyId, full }: { familyId: string; full: boolean }) {
  const [state, action, pending] = useActionState(createFamily, initial, "/admin");
  return <form action={action} className="space-y-6 rounded-[14px] border border-[#e3d7c3] bg-white p-6 md:p-8">
    <input type="hidden" name="familyId" value={familyId} />
    <div><label htmlFor="family-name" className="font-medium">Family name</label><input id="family-name" name="name" required maxLength={120} autoComplete="organization" className={field} /></div>
    <div><label htmlFor="parent-email" className="font-medium">Parent email</label><input id="parent-email" name="email" required type="email" maxLength={254} autoComplete="email" className={field} /></div>
    <label className="flex items-start gap-3"><input type="checkbox" name="founding" disabled={full} className="mt-1 size-5 accent-[#06451d]" /><span><span className="block font-medium">Founding family</span><span className="text-sm text-[#35594a]">{full ? "All founding places are currently assigned." : "Reserve one of the available founding places."}</span></span></label>
    <div className="border-t border-[#e3d7c3] pt-5"><button className={button} disabled={pending || state.committed}>{pending ? "Creating…" : "Create family and send invitation"}</button><Feedback state={state} />{state.committed && <a href="/admin" className="mt-3 inline-block text-sm underline">Return to the family list</a>}</div>
  </form>;
}

function ActionForm({ action, children, label, disabled = false }: { action: (previous: AdminActionState, form: FormData) => Promise<AdminActionState>; children: ReactNode; label: string; disabled?: boolean }) {
  const [state, submit, pending] = useActionState(action, initial);
  return <form action={submit}>{children}<button className={button} disabled={pending || disabled}>{pending ? "Working…" : label}</button><Feedback state={state} /></form>;
}

export function FoundingForm({ familyId, founding, full }: { familyId: string; founding: boolean; full: boolean }) {
  return <ActionForm action={changeFounding} label={founding ? "Remove founding status" : "Make founding family"} disabled={!founding && full}>
    <input type="hidden" name="familyId" value={familyId} /><input type="hidden" name="founding" value={String(!founding)} />
  </ActionForm>;
}

export function InvitationActions({ familyId, invitationId, requestId, email, active }: { familyId: string; invitationId: string; requestId: string; email: string; active: boolean }) {
  return <div className="mt-4 flex flex-wrap gap-3">
    <ActionForm action={resendInvitation} label="Send a new invitation"><input type="hidden" name="familyId" value={familyId} /><input type="hidden" name="email" value={email} /><input type="hidden" name="requestId" value={requestId} /></ActionForm>
    {active && <ActionForm action={revokeInvitation} label="Revoke invitation"><input type="hidden" name="invitationId" value={invitationId} /></ActionForm>}
  </div>;
}
