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

export function ukDayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function selectTodaySessions(sessions: ScopedSession[], now: Date): ScopedSession[] {
  const day = ukDayKey(now);
  return sessions.filter((session) => ukDayKey(new Date(session.starts_at)) === day)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}
