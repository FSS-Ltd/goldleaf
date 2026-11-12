"use client";

import { useClerk, useReverification, useUser } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { useAccountVerification } from "./useAccountVerification";
import { assertSession, runWithSession, type SessionBinding } from "@/lib/portal/session-binding";

export function useAccountProfile() {
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const verification = useAccountVerification();
  const options = { onNeedsReverification: verification.onNeedsReverification };
  function currentActor() { return { sessionId: clerk.session?.id, userId: clerk.user?.id }; }
  function requireUser(binding: SessionBinding) {
    const actor = currentActor();
    assertSession(binding, actor.sessionId, actor.userId);
    if (!clerk.user) throw new Error("Account unavailable");
    return clerk.user;
  }
  const updateName = useReverification((binding: SessionBinding, firstName: string, lastName: string) => runWithSession(binding, currentActor, () => requireUser(binding).update({ firstName, lastName })), options);
  const updatePassword = useReverification((binding: SessionBinding, currentPassword: string, newPassword: string) => runWithSession(binding, currentActor, () => {
    const currentUser = requireUser(binding);
    if (currentUser.passwordEnabled && !currentPassword) throw new Error("Current password required");
    return currentUser.updatePassword({ ...(currentPassword ? { currentPassword } : {}), newPassword, signOutOfOtherSessions: true });
  }), options);
  const createEmail = useReverification((binding: SessionBinding, email: string) => runWithSession(binding, currentActor, () => requireUser(binding).createEmailAddress({ email })), options);
  const setPrimary = useReverification((binding: SessionBinding, primaryEmailAddressId: string) => runWithSession(binding, currentActor, () => requireUser(binding).update({ primaryEmailAddressId })), options);
  const createGoogle = useReverification((binding: SessionBinding) => runWithSession(binding, currentActor, () => requireUser(binding).createExternalAccount({ strategy: "oauth_google", redirectUrl: "/account" })), options);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [emailId, setEmailId] = useState<string | null>(null);

  async function run(operation: (binding: SessionBinding) => Promise<void>, success: string) {
    if (!user || !clerk.session || !clerk.user || user.id !== clerk.user.id || inFlight.current) return;
    const actor = { sessionId: clerk.session.id, userId: clerk.user.id };
    inFlight.current = true;
    setMessage("");
    setPending(true);
    try {
      const binding = verification.bind(actor);
      await operation(binding);
      requireUser(binding);
      setMessage(success);
    } catch {
      setMessage("We could not update your account. Please check your details and try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function sendEmailCode(binding: SessionBinding, id: string) {
    const email = requireUser(binding).emailAddresses.find((item) => item.id === id);
    if (!email) throw new Error("Email address unavailable");
    await runWithSession(binding, currentActor, () => email.prepareVerification({ strategy: "email_code" }));
    requireUser(binding);
    setEmailId(id);
  }

  return {
    user, isLoaded, message, pending, verification, emailId,
    saveName: (first: string, last: string) => run(async (binding) => { await updateName(binding, first, last); }, "Name updated."),
    savePassword: (current: string, next: string) => run(async (binding) => { await updatePassword(binding, current, next); }, "Password updated."),
    addEmail: (email: string) => run(async (binding) => {
      const address = await createEmail(binding, email);
      await runWithSession(binding, currentActor, () => address.prepareVerification({ strategy: "email_code" }));
      requireUser(binding);
      setEmailId(address.id);
    }, "A verification code has been sent."),
    sendEmailCode: (id: string) => run((binding) => sendEmailCode(binding, id), "A verification code has been sent."),
    verifyEmail: (code: string) => run(async (binding) => {
      const email = requireUser(binding).emailAddresses.find((item) => item.id === emailId);
      if (!email) throw new Error("Email address unavailable");
      const result = await runWithSession(binding, currentActor, () => email.attemptVerification({ code }));
      if (result.verification?.status !== "verified") throw new Error("Verification incomplete");
      await runWithSession(binding, currentActor, () => requireUser(binding).reload());
      requireUser(binding);
      setEmailId(null);
    }, "Email verified."),
    makePrimary: (id: string) => run(async (binding) => { await setPrimary(binding, id); }, "Primary email updated."),
    connectGoogle: () => run(async (binding) => {
      const account = await createGoogle(binding);
      requireUser(binding);
      const redirect = account.verification?.externalVerificationRedirectURL;
      if (!redirect) throw new Error("Google connection unavailable");
      window.location.assign(redirect.href);
    }, ""),
  };
}
