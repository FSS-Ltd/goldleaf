"use client";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveRequestAction } from "@/app/(portal)/(provider)/admin/messages/actions";
import { sameSession } from "@/lib/portal/session-binding";
import { formatUkSession, ukLocalToIso } from "@/lib/portal/uk-time";
import type { ActionActor } from "@/lib/portal/action-actor-state";
import type { RequestContext } from "@/lib/portal/message-views";
import { button, field } from "@/components/portal/invoices/format";

type Resolution = {
  requestId: string;
  resolution: string;
  mode: "keep" | "reschedule";
  date: string;
  time: string;
  expectedStart: string;
  expectedStatus: RequestContext["session_status"];
};
function ResolveForm({
  actor,
  request,
}: {
  actor: ActionActor;
  request: RequestContext;
}) {
  const router = useRouter();
  const clerk = useClerk();
  const [value, setValue] = useState<Resolution>({
    requestId: request.id,
    resolution: "",
    mode: "keep",
    date: "",
    time: "",
    expectedStart: request.starts_at,
    expectedStatus: request.session_status,
  });
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const current = () =>
    sameSession(
      { userId: actor.userId, sessionId: actor.authSessionId },
      clerk.session?.id,
      clerk.user?.id,
    );
  async function submit() {
    if (!current() || pending || !value.resolution.trim()) return;
    if (value.mode === "reschedule") {
      try {
        ukLocalToIso(value.date, value.time);
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Check the date and time.",
        );
        return;
      }
    }
    setPending(true);
    setUncertain(true);
    setError("");
    try {
      const result = await resolveRequestAction(actor, value);
      if (!current()) return;
      if (!result.ok) {
        if (result.stale) {
          setUncertain(false);
          setStale(true);
          setError(
            "The session changed. Review the current time before resolving.",
          );
          router.refresh();
          return;
        }
        setError(
          "Resolution could not be confirmed. Refresh to check the recorded result, or retry these exact details.",
        );
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      if (current()) {
        setError(
          "Resolution could not be confirmed. Refresh to check the recorded result, or retry these exact details.",
        );
        router.refresh();
      }
    } finally {
      if (current()) setPending(false);
    }
  }
  return (
    <div className="mt-4 border-t border-[#e3d7c3] pt-4">
      <fieldset disabled={pending || uncertain}>
        <legend className="text-sm font-semibold">Resolution</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex min-h-12 items-center gap-2">
            <input
              type="radio"
              name={`mode-${request.id}`}
              checked={value.mode === "keep"}
              onChange={() => setValue({ ...value, mode: "keep" })}
            />{" "}
            Keep session time
          </label>
          <label className="flex min-h-12 items-center gap-2">
            <input
              type="radio"
              name={`mode-${request.id}`}
              checked={value.mode === "reschedule"}
              disabled={request.session_status !== "scheduled"}
              onChange={() => setValue({ ...value, mode: "reschedule" })}
            />{" "}
            Reschedule session
          </label>
        </div>
        {value.mode === "reschedule" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              UK date
              <input
                type="date"
                className={`${field} min-h-12`}
                value={value.date}
                onChange={(event) =>
                  setValue({ ...value, date: event.target.value })
                }
              />
            </label>
            <label className="text-sm">
              UK time
              <input
                type="time"
                className={`${field} min-h-12`}
                value={value.time}
                onChange={(event) =>
                  setValue({ ...value, time: event.target.value })
                }
              />
            </label>
          </div>
        )}
        <label className="mt-3 block text-sm">
          Resolution details
          <textarea
            className={`${field} min-h-12`}
            maxLength={4000}
            required
            value={value.resolution}
            onChange={(event) =>
              setValue({ ...value, resolution: event.target.value })
            }
          />
        </label>
      </fieldset>
      <button
        type="button"
        className={`${button} mt-4 min-h-12`}
        disabled={pending || (!stale && !value.resolution.trim())}
        onClick={() => {
          if (stale) {
            setValue({
              ...value,
              expectedStart: request.starts_at,
              expectedStatus: request.session_status,
              mode:
                request.session_status === "scheduled" ? value.mode : "keep",
            });
            setStale(false);
            setError("");
          } else void submit();
        }}
      >
        {pending
          ? "Resolving…"
          : stale
            ? "Review current session"
            : uncertain
              ? "Retry resolution"
              : value.mode === "keep"
                ? "Resolve without rescheduling"
                : "Resolve and reschedule"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a12626]">
          {error}
        </p>
      )}
    </div>
  );
}
export function AdminRequests({
  actor,
  requests,
}: {
  actor: ActionActor;
  requests: RequestContext[];
}) {
  return (
    <section aria-labelledby="session-requests">
      <h2 id="session-requests" className="!text-xl">
        Session requests
      </h2>
      {requests.length === 0 ? (
        <p className="mt-4 text-sm">No session requests yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {requests.map((request) => {
            const when = formatUkSession(
              request.starts_at,
              request.duration_minutes,
            );
            return (
              <li
                key={request.id}
                className="rounded-[14px] border border-[#e3d7c3] bg-[#fef8f3] p-5"
              >
                <h3 className="!text-lg">
                  {request.family_name ?? "Family"} · {request.child_name}
                </h3>
                <p className="mt-1 text-sm">
                  {request.resolved_at ? "Resolved" : "Open"} ·{" "}
                  {request.parent_name} · {when.day} · {when.time} ·{" "}
                  {request.duration_minutes} minutes
                  {request.location_label ? ` · ${request.location_label}` : ""}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                  {request.body}
                </p>
                {request.resolved_at ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                    <strong>Resolution:</strong> {request.resolution} ·{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/London",
                    }).format(new Date(request.resolved_at))}
                  </p>
                ) : (
                  <ResolveForm actor={actor} request={request} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
