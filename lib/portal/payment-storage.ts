export const paymentStoragePrefix = "goldleaf:invoice-payment:";
type StorageReader = Pick<Storage, "length" | "key" | "getItem" | "removeItem">;

export function clearPaymentStorage(storage: StorageReader, current?: { userId: string; sessionId: string }): void {
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(paymentStoragePrefix)) continue;
    let keep = false;
    if (current) {
      try {
        const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
        keep = typeof value === "object" && value !== null && "userId" in value && "sessionId" in value && value.userId === current.userId && value.sessionId === current.sessionId;
      } catch { /* Invalid records cannot be safely resumed. */ }
    }
    if (!keep) storage.removeItem(key);
  }
}

export async function signOutAndClearPaymentStorage(signOut: () => Promise<unknown>, getStorage: () => StorageReader): Promise<void> {
  await signOut();
  try {
    clearPaymentStorage(getStorage());
  } catch {
    // Storage may be disabled; sign-out has already succeeded.
  }
}
