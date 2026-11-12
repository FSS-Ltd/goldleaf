"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

type VerificationRequest = {
  complete: () => void;
  cancel: () => void;
  level: "first_factor" | "second_factor" | "multi_factor" | undefined;
};

export function useAccountVerification() {
  const { session } = useClerk();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function onNeedsReverification(next: VerificationRequest) {
    setMessage("");
    setCodeSent(false);
    setRequest(next);
  }

  async function sendCode() {
    if (!session || !request || pending) return;
    setPending(true);
    setMessage("");
    try {
      const verification = await session.startVerification({ level: request.level ?? "first_factor" });
      const factor = verification.supportedFirstFactors?.find((item) => item.strategy === "email_code");
      if (verification.status !== "needs_first_factor" || !factor) {
        setMessage("This account requires another security method. Please sign in again or contact Goldleaf for help.");
        return;
      }
      await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      setCodeSent(true);
    } catch {
      setMessage("We could not send a verification code. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function verify(code: string) {
    if (!session || !request || pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await session.attemptFirstFactorVerification({ strategy: "email_code", code });
      if (result.status !== "complete") {
        setMessage("This account requires another security method. Please sign in again or contact Goldleaf for help.");
        return;
      }
      request.complete();
      setRequest(null);
    } catch {
      setMessage("That code could not be verified. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    request?.cancel();
    setRequest(null);
  }

  return { request, onNeedsReverification, codeSent, message, pending, sendCode, verify, cancel };
}
