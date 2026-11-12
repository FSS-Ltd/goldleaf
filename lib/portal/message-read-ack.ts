// Failed acknowledgements remain eligible for the next observation.
export async function acknowledgeMessage(
  pending: Set<string>,
  sequence: string,
  send: () => Promise<boolean>,
  onAcknowledged: () => void,
): Promise<void> {
  if (pending.has(sequence)) return;
  pending.add(sequence);
  try {
    if (await send()) onAcknowledged();
  } catch {
    /* A later observation can retry. */
  } finally {
    pending.delete(sequence);
  }
}

type VisibilitySource = {
  readonly visibilityState: string;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
};
export function observeWhileVisible(
  source: VisibilitySource,
  observe: () => void,
  disconnect: () => void,
): () => void {
  const sync = () => {
    disconnect();
    if (source.visibilityState === "visible") observe();
  };
  source.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    source.removeEventListener("visibilitychange", sync);
    disconnect();
  };
}
