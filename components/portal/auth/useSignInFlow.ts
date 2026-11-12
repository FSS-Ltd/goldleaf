"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supportedAuthFactors, type AuthFactor } from "@/lib/portal/auth-factor";
import { useProtectGate } from "./useProtectGate";

type Destination = "/portal" | "/invite/accept";

export function useSignInFlow(destination: Destination) {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const gate = useProtectGate();
  const inFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<"password" | "factor" | "reset-email" | "reset-code" | "reset-password">(
    signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor" ? "factor" : "password",
  );

  async function finish() {
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize({ navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          if (session.currentTask.key === "reset-password") {
            router.replace(`/session-task/reset-password?destination=${encodeURIComponent(destination)}`);
            return;
          }
          setMessage("Your account needs an additional security step. Please contact Goldleaf for help signing in.");
          return;
        }
        window.location.assign(decorateUrl(destination));
      } });
      if (error) setMessage("We could not complete sign in. Please try again.");
    } else if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      setStage("factor");
    } else {
      setMessage("Your account needs another verification step. Please contact Goldleaf for help signing in.");
    }
  }

  async function password(emailAddress: string, password: string) {
    setMessage("");
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return setMessage("We could not sign you in. Check your details and try again.");
    await gate.resolve(signIn);
    await finish();
  }

  async function sendFactor(factor: AuthFactor) {
    setMessage("");
    const result = factor === "email_code" ? await signIn.mfa.sendEmailCode()
      : factor === "phone_code" ? await signIn.mfa.sendPhoneCode() : null;
    if (result?.error) setMessage("We could not send a code. Please try again.");
    else {
      await gate.resolve(signIn);
      if (result) setMessage("A verification code has been sent.");
    }
  }

  async function verifyFactor(factor: AuthFactor, code: string) {
    setMessage("");
    const result = factor === "email_code" ? await signIn.mfa.verifyEmailCode({ code })
      : factor === "phone_code" ? await signIn.mfa.verifyPhoneCode({ code })
      : factor === "totp" ? await signIn.mfa.verifyTOTP({ code })
      : factor === "backup_code" ? await signIn.mfa.verifyBackupCode({ code })
      : await signIn.mfa.passkey();
    if (result.error) return setMessage("Verification failed. Please try again.");
    await gate.resolve(signIn);
    await finish();
  }

  async function sendResetCode(identifier: string) {
    setMessage("");
    const created = await signIn.create({ identifier });
    if (created.error) return setMessage("We could not start password recovery. Check your email and try again.");
    await gate.resolve(signIn);
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) return setMessage("We could not send a recovery code. Please try again.");
    await gate.resolve(signIn);
    setStage("reset-code");
  }

  async function verifyResetCode(code: string) {
    setMessage("");
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (error) return setMessage("That code could not be verified. Please try again.");
    await gate.resolve(signIn);
    setStage("reset-password");
  }

  async function resetPassword(password: string) {
    setMessage("");
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true });
    if (error) return setMessage("We could not update your password. Please check it meets the requirements and try again.");
    await gate.resolve(signIn);
    await finish();
  }

  async function google() {
    setMessage("");
    const callback = `/sso-callback?destination=${encodeURIComponent(destination)}`;
    const { error } = await signIn.sso({ strategy: "oauth_google", redirectCallbackUrl: callback, redirectUrl: destination });
    if (error) setMessage("Google sign in is unavailable. Please try again.");
    else await gate.resolve(signIn);
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
    stage, setStage, message, gate, needsProtectCheck: !!signIn.protectCheck, pending: fetchStatus === "fetching" || gate.active, factors: supportedAuthFactors(signIn.supportedSecondFactors),
    continueProtect: () => safely(async () => { await gate.resolve(signIn); await finish(); }),
    password: (email: string, secret: string) => safely(() => password(email, secret)),
    sendFactor: (factor: AuthFactor) => safely(() => sendFactor(factor)),
    verifyFactor: (factor: AuthFactor, code: string) => safely(() => verifyFactor(factor, code)),
    sendResetCode: (email: string) => safely(() => sendResetCode(email)),
    verifyResetCode: (code: string) => safely(() => verifyResetCode(code)),
    resetPassword: (secret: string) => safely(() => resetPassword(secret)),
    google: () => safely(google),
  };
}
