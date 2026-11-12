"use client";
import { useState, useTransition } from "react";
import { updateSessionAction } from "@/app/(portal)/(provider)/staff/sessions/[id]/actions";
import type { ActionActor } from "@/lib/portal/action-actor";
import type { ScopedSession } from "@/lib/portal/sessions";

export function SessionControls({
  session,
  actor,
}: {
  session: ScopedSession;
  actor: ActionActor;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  function update(
    status: "in_progress" | "completed" | "cancelled" | null,
    attendance: "present" | "absent" | "not_recorded" | null,
  ) {
    setError("");
    start(async () => {
      try {
        const result = await updateSessionAction(actor, {
          sessionId: session.id,
          status,
          attendance,
        });
        if (!result.ok) setError(result.message);
      } catch {
        setError("Connection interrupted. Please retry this action.");
      }
    });
  }
  const button =
    "min-h-12 rounded-lg border border-[#06451d] px-4 py-2 text-sm disabled:opacity-50";
  return (
    <div className="mt-5 space-y-5">
      {session.status === "scheduled" && (
        <button
          className={button}
          disabled={pending}
          onClick={() => update("in_progress", null)}
        >
          Start session
        </button>
      )}
      {session.status === "in_progress" && (
        <button
          className={button}
          disabled={pending}
          onClick={() => update("completed", null)}
        >
          Complete session
        </button>
      )}
      {(session.status === "scheduled" || session.status === "in_progress") && (
        <button
          className={`${button} ml-3`}
          disabled={pending}
          onClick={() => update("cancelled", null)}
        >
          Cancel session
        </button>
      )}
      <div>
        <h2 className="!text-xl">Attendance</h2>
        <p className="mt-2 text-sm">
          {session.attendance === "not_recorded"
            ? "Not recorded"
            : session.attendance === "present"
              ? "Present"
              : "Absent"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={button}
            disabled={pending}
            onClick={() => update(null, "present")}
          >
            Mark present
          </button>
          <button
            className={button}
            disabled={pending}
            onClick={() => update(null, "absent")}
          >
            Mark absent
          </button>
          <button
            className={button}
            disabled={pending}
            onClick={() => update(null, "not_recorded")}
          >
            Not recorded
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
