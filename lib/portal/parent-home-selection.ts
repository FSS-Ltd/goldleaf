type HomeSession = {
  id: string;
  child_id: string;
  status: string;
  starts_at: string;
  duration_minutes: number;
};
type HomeUpdate = { child_id: string; published_at: string };
type HomeChild = { id: string; display_name: string };

export function selectParentHomeData<
  S extends HomeSession,
  U extends HomeUpdate,
  C extends HomeChild,
>(
  sessions: readonly S[],
  updates: readonly U[],
  children: readonly C[],
  now: number,
): { next: S | undefined; latest: { update: U; child: C } | undefined } {
  const childrenById = new Map(children.map((child) => [child.id, child]));
  const next = sessions
    .filter(
      (session) =>
        childrenById.has(session.child_id) &&
        (session.status === "scheduled" || session.status === "in_progress") &&
        Date.parse(session.starts_at) + session.duration_minutes * 60_000 >=
          now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const update = updates
    .filter((item) => childrenById.has(item.child_id))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
  const child = update && childrenById.get(update.child_id);
  return { next, latest: update && child ? { update, child } : undefined };
}
