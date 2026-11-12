export type SessionBinding = { sessionId: string; userId: string };

export function sameSession(binding: SessionBinding, sessionId: string | null | undefined, userId: string | null | undefined): boolean {
  return !!sessionId && !!userId && sessionId === binding.sessionId && userId === binding.userId;
}
