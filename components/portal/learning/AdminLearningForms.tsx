"use client";

import { useActionState } from "react";
import { ChildFields, ScheduleFields } from "./AdminInputFields";
import {
  createSession,
  registerChild,
} from "@/app/(portal)/(provider)/admin/children/actions";
import {
  adminFormDefaults,
  type AdminActionState,
} from "@/lib/portal/admin-form-state";
import type { ActionActor } from "@/lib/portal/action-actor";
import type { Child } from "@/lib/portal/learning-schemas";

const initial: AdminActionState = { status: "idle", message: "", revision: 0 };
const button =
  "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm text-white disabled:opacity-50";
function Feedback({ state }: { state: AdminActionState }) {
  return state.message ? (
    <p role={state.status === "error" ? "alert" : "status"} className="text-sm">
      {state.message}
    </p>
  ) : null;
}
function ActorFields({
  actor,
  requestId,
}: {
  actor: ActionActor;
  requestId: string;
}) {
  return (
    <>
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="actorUserId" value={actor.userId} />
      <input type="hidden" name="actorSessionId" value={actor.authSessionId} />
    </>
  );
}
export function RegisterChildForm({
  familyId,
  actor,
  requestId,
}: {
  familyId: string;
  actor: ActionActor;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(registerChild, initial);
  return (
    <form action={action} className="mt-5 space-y-4">
      <ActorFields actor={actor} requestId={requestId} />
      <input type="hidden" name="familyId" value={familyId} />
      <ChildFields
        key={state.revision}
        defaultName={adminFormDefaults(state).name ?? ""}
        pending={pending}
      />
      <button className={button} disabled={pending}>
        {pending ? "Saving…" : "Register child"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
export function ScheduleSessionForm({
  childOptions,
  actor,
  requestId,
}: {
  childOptions: Child[];
  actor: ActionActor;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createSession, initial);
  return (
    <form action={action} className="mt-5 space-y-4">
      <ActorFields actor={actor} requestId={requestId} />
      <ScheduleFields
        key={state.revision}
        options={childOptions}
        defaults={adminFormDefaults(state)}
        pending={pending}
      />
      <Feedback state={state} />
    </form>
  );
}
