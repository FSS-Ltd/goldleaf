import type { ScopedSession } from "./sessions";

export function selectPrioritySession(
  sessions: ScopedSession[],
  now: Date,
): ScopedSession | undefined {
  const ordered = [...sessions].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
  return (
    ordered.find((session) => session.status === "in_progress") ??
    ordered.find(
      (session) =>
        session.status === "scheduled" &&
        Date.parse(session.starts_at) >= now.getTime(),
    ) ??
    ordered.find((session) => session.status === "scheduled")
  );
}
