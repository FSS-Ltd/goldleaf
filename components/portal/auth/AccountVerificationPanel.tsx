"use client";

import type { FormEvent } from "react";
import type { useAccountVerification } from "./useAccountVerification";

export function AccountVerificationPanel({ flow }: { flow: ReturnType<typeof useAccountVerification> }) {
  if (!flow.request) return null;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    if (typeof code === "string") void flow.verify(code);
  }
  return <section aria-labelledby="account-verify-title" className="mt-5 rounded-[14px] border border-[#e3d7c3] bg-[#fef8f3] p-5">
    <h2 id="account-verify-title" className="font-display text-xl">Verify your identity</h2>
    <p className="mt-2 text-sm">Confirm your identity before changing your account.</p>
    {flow.message && <p role="status" className="mt-3 text-sm">{flow.message}</p>}
    {flow.codeSent ? <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-sm font-medium">Verification code<input name="code" autoComplete="one-time-code" required className="mt-2 w-full rounded-lg border border-[#e3d7c3] bg-white px-4 py-3" /></label>
      <button disabled={flow.pending} className="rounded-lg bg-[#06451d] px-4 py-2 text-white disabled:opacity-60">Verify</button>
    </form> : <button type="button" disabled={flow.pending} onClick={() => void flow.sendCode()} className="mt-4 rounded-lg bg-[#06451d] px-4 py-2 text-white disabled:opacity-60">Send verification code</button>}
    <button type="button" disabled={flow.pending} onClick={flow.cancel} className="ml-4 mt-4 text-sm underline">Cancel</button>
  </section>;
}
