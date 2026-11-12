"use client";
import { useState } from "react";
import { formatUkSession } from "@/lib/portal/uk-time";
import type { ActionActor } from "@/lib/portal/action-actor-state";
import type {
  MessageSession,
  RequestContext,
} from "@/lib/portal/message-views";
import { MessageComposer } from "./MessageComposer";

export function ParentRequests({
  actor,
  sessions,
  requests,
}: {
  actor: ActionActor;
  sessions: MessageSession[];
  requests: RequestContext[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const session = sessions.find((item) => item.id === selected);
  return (
    <section
      className="rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-5"
      aria-labelledby="your-requests"
    >
      <h2 id="your-requests" className="!text-xl">
        Your requests
      </h2>
      <p className="mt-2 text-sm text-[#35594a]">
        Only you and administrators can see these requests. Submitting a request
        does not change the session time.
      </p>
      {requests.length === 0 ? (
        <p className="mt-4 text-sm">No requests yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((request) => {
            const when = formatUkSession(
              request.starts_at,
              request.duration_minutes,
            );
            return (
              <li
                key={request.id}
                className="rounded-xl border border-[#e3d7c3] bg-[#fef8f3] p-4"
              >
                <p className="text-sm font-semibold">
                  {request.resolved_at ? "Resolved" : "Open"} ·{" "}
                  {request.child_name}
                </p>
                <p className="mt-1 text-sm">
                  {when.day} · {when.time}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {request.body}
                </p>
                {request.resolution && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    <strong>Resolution:</strong> {request.resolution}
                    {request.resolved_at
                      ? ` · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(request.resolved_at))}`
                      : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <h3 className="mt-6 !text-lg">Request a session change</h3>
      {sessions.length === 0 ? (
        <p className="mt-2 text-sm">No sessions are available.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sessions.map((item) => {
            const when = formatUkSession(item.starts_at, item.duration_minutes);
            return (
              <li
                key={item.id}
                className="rounded-xl border border-[#e3d7c3] bg-[#fef8f3] p-4"
              >
                <p className="text-sm font-medium">
                  {item.child_name} · {when.day}
                </p>
                <p className="mt-1 text-sm text-[#35594a]">
                  {when.time} · {item.duration_minutes} minutes ·{" "}
                  {item.status.replaceAll("_", " ")}
                  {item.location_label ? ` · ${item.location_label}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-2 min-h-12 text-sm underline"
                  onClick={() => setSelected(item.id)}
                >
                  Request change
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {session && (
        <div className="mt-4 rounded-xl border border-[#e3d7c3] bg-[#fef8f3]">
          <div className="p-5">
            <h3 className="!text-lg">
              Request change for {session.child_name}
            </h3>
            <p className="mt-1 text-sm">
              {formatUkSession(session.starts_at, session.duration_minutes).day}{" "}
              ·{" "}
              {
                formatUkSession(session.starts_at, session.duration_minutes)
                  .time
              }
            </p>
          </div>
          <MessageComposer
            key={session.id}
            actor={actor}
            role="parent"
            targetId={session.id}
            kind="request"
          />
        </div>
      )}
    </section>
  );
}
