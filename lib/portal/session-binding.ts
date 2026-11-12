export type SessionBinding = { sessionId: string; userId: string; signal?: AbortSignal };

export function sameSession(binding: SessionBinding, sessionId: string | null | undefined, userId: string | null | undefined): boolean {
  return !!sessionId && !!userId && sessionId === binding.sessionId && userId === binding.userId;
}

export function assertSession(binding: SessionBinding, sessionId: string | null | undefined, userId: string | null | undefined): void {
  if (binding.signal?.aborted || !sameSession(binding, sessionId, userId)) throw new Error("Session changed");
}

export function assertActiveVerification(binding: SessionBinding, sessionId: string | null | undefined, userId: string | null | undefined, active: boolean): void {
  assertSession(binding, sessionId, userId);
  if (!active) throw new Error("Verification cancelled");
}

export async function runWithSession<T>(binding: SessionBinding, current: () => { sessionId: string | null | undefined; userId: string | null | undefined }, operation: () => Promise<T>): Promise<T> {
  const actor = current();
  assertSession(binding, actor.sessionId, actor.userId);
  return operation();
}
