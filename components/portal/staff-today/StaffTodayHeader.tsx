import { ArrowRight } from "lucide-react";
import type { ScopedSession } from "@/lib/portal/sessions";

export function StaffTodayHeader({
  date,
  sessionCount,
  priority,
}: {
  date: string;
  sessionCount: number;
  priority: ScopedSession | undefined;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#e3d7c3] pb-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526c5c]">
          Staff portal · {date}
        </p>
        <h1 className="sr-only mt-3 !text-[clamp(2rem,4vw,2.6rem)] md:not-sr-only">
          Today
        </h1>
        <p className="mt-2 text-sm text-[#35594a]">
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"} scheduled
          today
        </p>
      </div>
      {priority && (
        <div className="hidden md:block">
          <a
            className="btn btn-primary"
            href={`/staff/sessions/${priority.id}`}
          >
            Open session{" "}
            <span className="font-normal">· {priority.child_name}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
