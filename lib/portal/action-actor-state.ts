export type ActionActor = { userId: string; authSessionId: string };

export function matchesActionActor(
  expected: ActionActor,
  verifiedUserId: string,
  userId: string | null,
  sessionId: string | null,
): boolean {
  return (
    expected.userId === verifiedUserId &&
    expected.userId === userId &&
    expected.authSessionId === sessionId
  );
}
