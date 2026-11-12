"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProtectGate } from "./useProtectGate";
import { signupStep } from "@/lib/portal/signup-step";

export function useSignUpFlow() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const gate = useProtectGate();
  const inFlight = useRef(false);
  const [stage, setStage] = useState<"details" | "verify" | "username">(
    signUp.status === "missing_requirements" && signUp.missingFields.includes("username") ? "username"
      : signUp.unverifiedFields.includes("email_address") ? "verify" : "details",
  );
  const [message, setMessage] = useState("");

  async function create(emailAddress: string, password: string, firstName: string, lastName: string) {
    setMessage("");
    const result = await signUp.password({ emailAddress, password, firstName, lastName });
    if (result.error) return setMessage("We could not create your account. Check your details and try again.");
    await gate.resolve(signUp);
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) return setMessage("We could not send a verification code. Please try again.");
    await gate.resolve(signUp);
    setStage(signUp.missingFields.includes("username") ? "username" : "verify");
  }

  async function finish() {
    const step = signupStep(signUp.status, signUp.missingFields, signUp.unverifiedFields);
    if (step === "username" || step === "verify") return setStage(step);
    if (step !== "complete") return setMessage("Your account needs another verification step. Please contact Goldleaf for help.");
    const finalized = await signUp.finalize({ navigate: ({ session, decorateUrl }) => {
      if (session?.currentTask) {
        if (session.currentTask.key === "reset-password") {
          router.replace("/session-task/reset-password?destination=%2Finvite%2Faccept");
          return;
        }
        setMessage("Your account needs an additional security step. Please contact Goldleaf for help.");
        return;
      }
      window.location.assign(decorateUrl("/invite/accept"));
    } });
    if (finalized.error) setMessage("We could not complete account creation. Please try again.");
  }

  async function verify(code: string) {
    setMessage("");
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return setMessage("That code could not be verified. Please try again.");
    await gate.resolve(signUp);
    await finish();
  }

  async function resend() {
    setMessage("");
    const { error } = await signUp.verifications.sendEmailCode();
    if (!error) await gate.resolve(signUp);
    setMessage(error ? "We could not send a verification code. Please try again." : "A new code has been sent.");
  }

  async function submitUsername(username: string) {
    setMessage("");
    const { error } = await signUp.update({ username: username.trim() });
    if (error) return setMessage("We could not use that username. Please choose another and try again.");
    await gate.resolve(signUp);
    await finish();
  }

  async function safely(operation: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await operation();
    } catch {
      setMessage("We could not complete that request. Please check your connection and try again.");
    } finally {
      inFlight.current = false;
    }
  }

  return {
    stage, message, gate, needsProtectCheck: !!signUp.protectCheck, pending: fetchStatus === "fetching" || gate.active,
    continueProtect: () => safely(async () => {
      await gate.resolve(signUp);
      if (signUp.status === "complete") return finish();
      if (signUp.unverifiedFields.includes("email_address")) {
        const { error } = await signUp.verifications.sendEmailCode();
        if (error) return setMessage("We could not send a verification code. Please try again.");
        await gate.resolve(signUp);
        setStage("verify");
        return;
      }
      setMessage("Your account needs another verification step. Please contact Goldleaf for help.");
    }),
    create: (email: string, password: string, first: string, last: string) => safely(() => create(email, password, first, last)),
    verify: (code: string) => safely(() => verify(code)),
    submitUsername: (username: string) => safely(() => submitUsername(username)),
    resend: () => safely(resend),
  };
}
