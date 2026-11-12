import type { ProtectCheck } from "./protect-check";

export function protectSdkUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid verification service");
  return url.href;
}

export async function runProtectWidget(check: ProtectCheck, container: HTMLDivElement, signal: AbortSignal): Promise<string> {
  const url = protectSdkUrl(check.sdkUrl);
  if (signal.aborted) throw new Error("Verification cancelled");
  if (check.expiresAt !== undefined && check.expiresAt <= Date.now()) throw new Error("Verification expired");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const delay = check.expiresAt === undefined ? undefined : Math.min(2_147_483_647, Math.max(0, check.expiresAt - Date.now()));
  const timer = delay === undefined ? undefined : setTimeout(abort, delay);
  try {
    const cancelled = new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("Verification cancelled or expired")), { once: true }));
    const widgetModule: unknown = await Promise.race([import(/* webpackIgnore: true */ url), cancelled]);
    if (!widgetModule || typeof widgetModule !== "object" || !("default" in widgetModule) || typeof widgetModule.default !== "function") throw new Error("Verification unavailable");
    const result: unknown = await Promise.race([
      widgetModule.default(container, { token: check.token, uiHints: check.uiHints, signal: controller.signal }),
      cancelled,
    ]);
    if (typeof result !== "string" || !result) throw new Error("Verification incomplete");
    return result;
  } finally {
    controller.abort();
    signal.removeEventListener("abort", abort);
    if (timer !== undefined) clearTimeout(timer);
    container.replaceChildren();
  }
}
