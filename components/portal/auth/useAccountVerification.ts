"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { assertActiveVerification, assertSession, sameSession, type SessionBinding } from "@/lib/portal/session-binding";

type VerificationRequest = {
  complete: () => void;
  cancel: () => void;
  level: "first_factor" | "second_factor" | "multi_factor" | undefined;
};
type BoundRequest = VerificationRequest & { binding: SessionBinding };

export function useAccountVerification() {
  const clerk = useClerk();
  const bindingRef = useRef<SessionBinding | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef<BoundRequest | null>(null);
  const [request, setRequest] = useState<BoundRequest | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [actorKey, setActorKey] = useState("");

  useEffect(() => {
    function invalidate() {
      const current = requestRef.current;
      requestRef.current = null;
      bindingRef.current = null;
      controllerRef.current?.abort();
      controllerRef.current = null;
      current?.cancel();
      setRequest(null);
      setCodeSent(false);
      setMessage("");
    }
    const unsubscribe = clerk.addListener(({ session, user }) => {
      setActorKey(`${session?.id ?? ""}:${user?.id ?? ""}`);
      const binding = bindingRef.current;
      if (binding && !sameSession(binding, session?.id, user?.id)) invalidate();
    });
    return () => {
      unsubscribe();
      const current = requestRef.current;
      requestRef.current = null;
      bindingRef.current = null;
      controllerRef.current?.abort();
      controllerRef.current = null;
      current?.cancel();
    };
  }, [clerk]);

  function bind(binding: SessionBinding): SessionBinding {
    assertSession(binding, clerk.session?.id, clerk.user?.id);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const bound = { ...binding, signal: controller.signal };
    bindingRef.current = bound;
    return bound;
  }

  function onNeedsReverification(next: VerificationRequest) {
    const binding = bindingRef.current;
    if (!binding || binding.signal?.aborted || !sameSession(binding, clerk.session?.id, clerk.user?.id)) {
      next.cancel();
      return;
    }
    const bound = { ...next, binding };
    requestRef.current = bound;
    setMessage("");
    setCodeSent(false);
    setRequest(bound);
  }

  function check(bound: BoundRequest) {
    assertActiveVerification(bound.binding, clerk.session?.id, clerk.user?.id, requestRef.current === bound);
  }

  async function sendCode() {
    if (!request || pending) return;
    setPending(true);
    setMessage("");
    try {
      check(request);
      const session = clerk.session;
      if (!session) throw new Error("Session unavailable");
      const verification = await session.startVerification({ level: request.level ?? "first_factor" });
      check(request);
      const factor = verification.supportedFirstFactors?.find((item) => item.strategy === "email_code");
      if (verification.status !== "needs_first_factor" || !factor) {
        setMessage("This account requires another security method. Please sign in again or contact Goldleaf for help.");
        return;
      }
      await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      check(request);
      setCodeSent(true);
    } catch {
      if (requestRef.current === request) setMessage("We could not send a verification code. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function verify(code: string) {
    if (!request || pending) return;
    setPending(true);
    setMessage("");
    try {
      check(request);
      const session = clerk.session;
      if (!session) throw new Error("Session unavailable");
      const result = await session.attemptFirstFactorVerification({ strategy: "email_code", code });
      check(request);
      if (result.status !== "complete") {
        setMessage("This account requires another security method. Please sign in again or contact Goldleaf for help.");
        return;
      }
      requestRef.current = null;
      request.complete();
      setRequest(null);
    } catch {
      if (requestRef.current === request) setMessage("That code could not be verified. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    const current = requestRef.current;
    requestRef.current = null;
    bindingRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
    current?.cancel();
    setRequest(null);
    setCodeSent(false);
  }

  return { request, bind, onNeedsReverification, codeSent, message, pending, actorKey, sendCode, verify, cancel };
}
