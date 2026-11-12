import { ArrowRight, Clock } from "lucide-react";
import type { ScopedSession } from "@/lib/portal/sessions";
import { sessionStatusLabel } from "@/lib/portal/session-status";
import { formatUkSession } from "@/lib/portal/uk-time";

export function StaffSessionCard({
  session,
  priority,
}: {
  session: ScopedSession;
  priority: boolean;
}) {
  return (
    <li
      className={`rounded-[14px] border bg-[#f6eee2] p-5 ${priority ? "border-2 border-[#06451d]" : "border-[#e3d7c3]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <h3 className="!text-lg">{session.child_name}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#35594a]">
            <Clock size={16} aria-hidden="true" />
            {formatUkSession(session.starts_at, session.duration_minutes).time}
          </p>
          <p className="mt-1 text-sm text-[#35594a]">
            {session.family_name ?? "Family"}
            {session.location_label ? ` · ${session.location_label}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-[#e5e9dc] px-3 py-1 text-xs font-semibold text-[#16462a]">
          {sessionStatusLabel(session.status)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3d7c3] pt-4">
        <span className="text-sm text-[#35594a]">
          Attendance:{" "}
          {session.attendance === "not_recorded"
            ? "Not recorded"
            : session.attendance === "present"
              ? "Present"
              : "Absent"}
        </span>
        <a
          className={
            priority
              ? "btn btn-primary w-full sm:w-auto"
              : "inline-flex min-h-10 items-center gap-2 font-semibold text-[#06451d] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          }
          href={`/staff/sessions/${session.id}`}
        >
          Open session <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </li>
  );
}
