"use client";

import { useActionState, useState } from "react";
import { formatUkSession, ukLocalToIso } from "@/lib/portal/uk-time";
import {
  createSession,
  registerChild,
  type AdminActionState,
} from "@/app/(portal)/(provider)/admin/children/actions";
import type { ActionActor } from "@/lib/portal/action-actor";
import { site } from "@/content/site";
import type { Child } from "@/lib/portal/learning-schemas";

const initial: AdminActionState = { status: "idle", message: "" };
const input =
  "mt-2 w-full rounded-lg border border-[#d6c8b5] bg-white px-4 py-3";
const button =
  "min-h-12 rounded-lg bg-[#06451d] px-5 py-3 text-sm text-white disabled:opacity-50";
function Feedback({ state }: { state: AdminActionState }) {
  return state.message ? (
    <p role={state.status === "error" ? "alert" : "status"} className="text-sm">
      {state.message}
    </p>
  ) : null;
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
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="actorUserId" value={actor.userId} />
      <input type="hidden" name="actorSessionId" value={actor.authSessionId} />
      <input type="hidden" name="familyId" value={familyId} />
      <label className="block text-sm font-medium">
        Child’s display name
        <input
          className={input}
          name="name"
          maxLength={120}
          disabled={pending}
          required
        />
      </label>
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
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  let end: ReturnType<typeof formatUkSession> | null = null;
  let invalidTime = false;
  if (date && time) {
    try {
      end = formatUkSession(ukLocalToIso(date, time), site.sessionMinutes);
    } catch {
      invalidTime = true;
    }
  }
  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="actorUserId" value={actor.userId} />
      <input type="hidden" name="actorSessionId" value={actor.authSessionId} />
      <label className="block text-sm font-medium">
        Child
        <select
          className={input}
          name="childId"
          disabled={pending}
          required
          defaultValue=""
        >
          <option value="" disabled>
            Select a child
          </option>
          {childOptions.map((child) => (
            <option key={child.id} value={child.id}>
              {child.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Date
        <input
          className={input}
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={pending}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        UK start time
        <input
          className={input}
          name="time"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          disabled={pending}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Location <span className="font-normal">(optional)</span>
        <input
          className={input}
          name="location"
          maxLength={200}
          disabled={pending}
        />
      </label>
      <p className="text-sm text-[#35594a]">
        Sessions last {site.sessionMinutes} minutes.
        {end && ` Ends ${end.endDay} at ${end.endTime}.`}
      </p>
      {invalidTime && (
        <p role="alert" className="text-sm">
          Choose another time: this UK clock time is invalid or occurs twice.
        </p>
      )}
      <button
        className={button}
        disabled={pending || childOptions.length === 0 || invalidTime}
      >
        {pending ? "Scheduling…" : "Schedule session"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
