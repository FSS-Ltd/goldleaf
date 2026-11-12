"use client";

import { useActionState } from "react";
import { sendStaffInvite, revokeStaffInvite, saveStaffAssignments, type StaffActionState } from "@/app/(portal)/(provider)/admin/staff/actions";

const initial: StaffActionState = { status: "idle", message: "" };
const input = "mt-2 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3 text-[#1b3022]";
const button = "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm font-medium text-white disabled:opacity-60";
function Feedback({ state }: { state: StaffActionState }) { return state.message ? <p role={state.status === "error" ? "alert" : "status"} className="mt-3 text-sm">{state.message}</p> : null; }

export function StaffInviteForm({ requestId, email }: { requestId: string; email?: string }) {
  const [state, action, pending] = useActionState(sendStaffInvite, initial);
  return <form action={action} className="space-y-4">
    <input type="hidden" name="requestId" value={requestId} />
    {email ? <input type="hidden" name="email" value={email} /> : <label className="block text-sm font-medium">Staff email<input className={input} name="email" type="email" required autoComplete="email" /></label>}
    <button className={button} disabled={pending}>{pending ? "Sending…" : email ? "Resend invitation" : "Send invitation"}</button>
    <Feedback state={state} />
  </form>;
}

export function RevokeStaffForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(revokeStaffInvite, initial);
  return <form action={action}><input type="hidden" name="invitationId" value={invitationId} /><button className="min-h-12 text-sm underline" disabled={pending}>{pending ? "Revoking…" : "Revoke invitation"}</button><Feedback state={state} /></form>;
}

export function StaffAssignmentsForm({ staffId, families, assigned }: { staffId: string; families: { id: string; display_name: string | null }[]; assigned: string[] }) {
  const [state, action, pending] = useActionState(saveStaffAssignments, initial);
  return <form action={action} className="mt-5">
    <input type="hidden" name="staffId" value={staffId} />
    <fieldset disabled={pending}><legend className="sr-only">Family access</legend><div className="divide-y divide-[#e3d7c3] rounded-lg border border-[#e3d7c3] bg-white">{families.map((family) => <label key={family.id} className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm"><input type="checkbox" name="familyId" value={family.id} defaultChecked={assigned.includes(family.id)} />{family.display_name ?? "Unnamed family"}</label>)}</div></fieldset>
    <button className={`${button} mt-5`} disabled={pending}>{pending ? "Saving…" : "Save family access"}</button>
    <Feedback state={state} />
  </form>;
}
