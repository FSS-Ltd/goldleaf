"use client";

import { useActionState } from "react";
import type { ActionActor } from "@/lib/portal/action-actor";
import {
  AssignmentFields,
  OnboardingActorFields,
  StaffEmailField,
} from "@/lib/portal/onboarding-form-controls";
import {
  onboardingDefaults,
  onboardingScopeKey,
} from "@/lib/portal/onboarding-form-state";
import {
  sendStaffInvite,
  revokeStaffInvite,
  saveStaffAssignments,
  type StaffActionState,
} from "@/app/(portal)/(provider)/admin/staff/actions";

const initial: StaffActionState = { status: "idle", message: "" };
const button =
  "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm font-medium text-white disabled:opacity-60";

function Feedback({ state }: { state: StaffActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className="mt-3 text-sm"
    >
      {state.message}
    </p>
  );
}

export function StaffInviteForm({
  requestId,
  email,
  actor,
}: {
  requestId: string;
  email?: string;
  actor: ActionActor;
}) {
  const [state, action, pending] = useActionState(sendStaffInvite, initial);
  const buttonLabel = email ? "Resend invitation" : "Send invitation";
  return (
    <form action={action} className="space-y-4">
      <OnboardingActorFields actor={actor} />
      <input type="hidden" name="requestId" value={requestId} />
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <StaffEmailField
          key={state.revision ?? 0}
          value={onboardingDefaults(state).email ?? ""}
          pending={pending}
        />
      )}
      <button className={button} disabled={pending}>
        {pending ? "Sending…" : buttonLabel}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function RevokeStaffForm({
  invitationId,
  actor,
}: {
  invitationId: string;
  actor: ActionActor;
}) {
  const [state, action, pending] = useActionState(revokeStaffInvite, initial);
  return (
    <form action={action}>
      <OnboardingActorFields actor={actor} />
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="min-h-12 text-sm underline" disabled={pending}>
        {pending ? "Revoking…" : "Revoke invitation"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function StaffAssignmentsForm({
  staffId,
  families,
  assigned,
  actor,
}: {
  staffId: string;
  families: { id: string; display_name: string | null }[];
  assigned: string[];
  actor: ActionActor;
}) {
  const [state, action, pending] = useActionState(
    saveStaffAssignments,
    initial,
  );
  return (
    <form action={action} className="mt-5">
      <OnboardingActorFields actor={actor} />
      <input type="hidden" name="staffId" value={staffId} />
      <AssignmentFields
        key={onboardingScopeKey(actor, staffId)}
        families={families}
        assigned={onboardingDefaults(state).familyIds ?? assigned}
        pending={pending}
      />
      <button className={`${button} mt-5`} disabled={pending}>
        {pending ? "Saving…" : "Save family access"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
