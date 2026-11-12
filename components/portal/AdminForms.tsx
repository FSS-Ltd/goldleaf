"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionActor } from "@/lib/portal/action-actor";
import {
  FamilyFields,
  OnboardingAttemptId,
  OnboardingActorFields,
} from "@/lib/portal/onboarding-form-controls";
import { onboardingDefaults } from "@/lib/portal/onboarding-form-state";
import {
  changeFounding,
  createFamily,
  resendInvitation,
  revokeInvitation,
  type AdminActionState,
} from "@/app/(portal)/(provider)/admin/actions";

const initial: AdminActionState = { status: "idle", message: "" };
const button =
  "min-h-11 rounded-lg bg-[#06451d] px-5 py-3 text-sm font-medium text-white disabled:opacity-60";

function Feedback({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`mt-4 text-sm ${state.status === "error" ? "text-red-800" : "text-[#06451d]"}`}
    >
      {state.message}
    </p>
  );
}

export function CreateFamilyForm({
  familyId,
  full,
  actor,
}: {
  familyId: string;
  full: boolean;
  actor: ActionActor;
}) {
  const [state, action, pending] = useActionState(
    createFamily,
    initial,
    "/admin",
  );
  return (
    <form
      action={action}
      className="space-y-6 rounded-[14px] border border-[#e3d7c3] bg-white p-6 md:p-8"
    >
      <OnboardingActorFields actor={actor} />
      <OnboardingAttemptId
        name="familyId"
        initialId={state.attemptId ?? familyId}
      />
      <FamilyFields
        key={state.revision ?? 0}
        defaults={onboardingDefaults(state)}
        full={full}
        pending={pending}
        committed={state.committed}
        buttonClass={button}
      />
      <div>
        <Feedback state={state} />
        {state.committed && (
          <a href="/admin" className="mt-3 inline-block text-sm underline">
            Return to the family list
          </a>
        )}
      </div>
    </form>
  );
}

function ActionForm({
  action,
  children,
  label,
  actor,
  disabled = false,
  requestId,
}: {
  action: (
    previous: AdminActionState,
    form: FormData,
  ) => Promise<AdminActionState>;
  children: ReactNode;
  label: string;
  actor: ActionActor;
  disabled?: boolean;
  requestId?: string;
}) {
  const [state, submit, pending] = useActionState(action, initial);
  return (
    <form action={submit}>
      <OnboardingActorFields actor={actor} />
      {requestId && (
        <OnboardingAttemptId
          key={state.revision ?? 0}
          name="requestId"
          initialId={state.attemptId ?? state.nextRequestId ?? requestId}
        />
      )}
      {children}
      <button className={button} disabled={pending || disabled}>
        {pending ? "Working…" : label}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function FoundingForm({
  familyId,
  founding,
  full,
  actor,
}: {
  familyId: string;
  founding: boolean;
  full: boolean;
  actor: ActionActor;
}) {
  return (
    <ActionForm
      actor={actor}
      action={changeFounding}
      label={founding ? "Remove founding status" : "Make founding family"}
      disabled={!founding && full}
    >
      <input type="hidden" name="familyId" value={familyId} />
      <input type="hidden" name="founding" value={String(!founding)} />
    </ActionForm>
  );
}

export function InvitationActions({
  familyId,
  invitationId,
  requestId,
  email,
  active,
  actor,
}: {
  familyId: string;
  invitationId: string;
  requestId: string;
  email: string;
  active: boolean;
  actor: ActionActor;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <ActionForm
        actor={actor}
        action={resendInvitation}
        requestId={requestId}
        label="Send a new invitation"
      >
        <input type="hidden" name="familyId" value={familyId} />
        <input type="hidden" name="email" value={email} />
      </ActionForm>
      {active && (
        <ActionForm
          actor={actor}
          action={revokeInvitation}
          label="Revoke invitation"
        >
          <input type="hidden" name="invitationId" value={invitationId} />
        </ActionForm>
      )}
    </div>
  );
}
