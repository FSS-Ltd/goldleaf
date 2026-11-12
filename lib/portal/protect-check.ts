export type ProtectCheck = { sdkUrl: string; token: string; expiresAt?: number; uiHints?: Record<string, string> };
type ProtectSource = {
  readonly protectCheck: ProtectCheck | null;
  submitProtectCheck(params: { proofToken: string }): Promise<{ error: unknown }>;
};

export async function resolveProtectChecks(source: ProtectSource, run: (check: ProtectCheck, signal: AbortSignal) => Promise<string>, signal: AbortSignal): Promise<void> {
  for (let count = 0; source.protectCheck; count++) {
    if (count >= 5 || signal.aborted) throw new Error("Verification cancelled or incomplete");
    const check = source.protectCheck;
    if (check.expiresAt !== undefined && check.expiresAt <= Date.now()) throw new Error("Verification expired");
    const proof = await run(check, signal);
    if (!proof || signal.aborted || (check.expiresAt !== undefined && check.expiresAt <= Date.now())) throw new Error("Verification expired or incomplete");
    const result = await source.submitProtectCheck({ proofToken: proof });
    if (result.error || signal.aborted) throw new Error("Verification failed or cancelled");
  }
}
