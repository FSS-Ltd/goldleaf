import { sameSession, type SessionBinding } from "./session-binding";

type Actor = {
  sessionId: string | null | undefined;
  userId: string | null | undefined;
};
export async function getBoundEventToken(
  binding: SessionBinding,
  current: () => Actor,
  getToken: () => Promise<string | null>,
): Promise<string | null> {
  const before = current();
  if (
    binding.signal?.aborted ||
    !sameSession(binding, before.sessionId, before.userId)
  )
    return null;
  const token = await getToken();
  const after = current();
  return !binding.signal?.aborted &&
    sameSession(binding, after.sessionId, after.userId)
    ? token
    : null;
}
