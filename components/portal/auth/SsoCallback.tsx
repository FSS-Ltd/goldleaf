"use client";

import { HandleSSOCallback, useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectGate } from "./ProtectGate";
import { useProtectGate } from "./useProtectGate";

export function SsoCallback({ destination }: { destination: "/portal" | "/invite/accept" }) {
  const clerk = useClerk();
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const gate = useProtectGate();
  const [message, setMessage] = useState("");
  const hasCheck = !!signIn.protectCheck || !!signUp.protectCheck;

  async function continueChecks() {
    setMessage("");
    try {
      await gate.resolve(signIn);
      await gate.resolve(signUp);
    } catch {
      setMessage("The security check could not be completed. Please try again.");
    }
  }

  if (!clerk.loaded) return <p>Completing sign in…</p>;
  return <section className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-7 text-[#1b3022]">
    <h1 className="font-display !text-2xl text-[#06451d]">Completing sign in</h1>
    {message && <p role="alert" className="mt-4 text-sm">{message}</p>}
    <ProtectGate container={gate.container} active={gate.active} cancel={gate.cancel} />
    {hasCheck ? <button disabled={gate.active} onClick={() => void continueChecks()} className="mt-5 rounded-lg bg-[#06451d] px-5 py-3 font-medium text-white disabled:opacity-60">Continue security check</button> : <>
      <p className="mt-4 text-sm">Please wait…</p>
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          if (session?.currentTask) {
            if (session.currentTask.key === "reset-password") {
              router.replace(`/session-task/reset-password?destination=${encodeURIComponent(destination)}`);
              return;
            }
            setMessage("Your account needs an additional security step. Please contact Goldleaf for help.");
            return;
          }
          window.location.assign(decorateUrl(destination));
        }}
        navigateToSignIn={() => router.replace(`/sign-in?redirect_url=${encodeURIComponent(destination)}`)}
        navigateToSignUp={() => router.replace("/sign-up")}
      />
    </>}
  </section>;
}
