"use client";

import { useReverification, useUser } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { useAccountVerification } from "./useAccountVerification";

export function useAccountProfile() {
  const { user, isLoaded } = useUser();
  const verification = useAccountVerification();
  const options = { onNeedsReverification: verification.onNeedsReverification };
  function requireUser() {
    if (!user) throw new Error("Account unavailable");
    return user;
  }
  const updateName = useReverification((firstName: string, lastName: string) => requireUser().update({ firstName, lastName }), options);
  const updatePassword = useReverification((currentPassword: string, newPassword: string) => {
    const currentUser = requireUser();
    if (currentUser.passwordEnabled && !currentPassword) throw new Error("Current password required");
    return currentUser.updatePassword({ ...(currentPassword ? { currentPassword } : {}), newPassword, signOutOfOtherSessions: true });
  }, options);
  const createEmail = useReverification((email: string) => requireUser().createEmailAddress({ email }), options);
  const setPrimary = useReverification((primaryEmailAddressId: string) => requireUser().update({ primaryEmailAddressId }), options);
  const createGoogle = useReverification(() => requireUser().createExternalAccount({ strategy: "oauth_google", redirectUrl: "/account" }), options);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [emailId, setEmailId] = useState<string | null>(null);

  async function run(operation: () => Promise<void>, success: string) {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    setMessage("");
    setPending(true);
    try {
      await operation();
      setMessage(success);
    } catch {
      setMessage("We could not update your account. Please check your details and try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function sendEmailCode(id: string) {
    const email = user?.emailAddresses.find((item) => item.id === id);
    if (!email) throw new Error("Email address unavailable");
    await email.prepareVerification({ strategy: "email_code" });
    setEmailId(id);
  }

  return {
    user, isLoaded, message, pending, verification, emailId,
    saveName: (first: string, last: string) => run(async () => { await updateName(first, last); }, "Name updated."),
    savePassword: (current: string, next: string) => run(async () => { await updatePassword(current, next); }, "Password updated."),
    addEmail: (email: string) => run(async () => {
      const address = await createEmail(email);
      await address.prepareVerification({ strategy: "email_code" });
      setEmailId(address.id);
    }, "A verification code has been sent."),
    sendEmailCode: (id: string) => run(() => sendEmailCode(id), "A verification code has been sent."),
    verifyEmail: (code: string) => run(async () => {
      const email = user?.emailAddresses.find((item) => item.id === emailId);
      if (!email) throw new Error("Email address unavailable");
      const result = await email.attemptVerification({ code });
      if (result.verification?.status !== "verified") throw new Error("Verification incomplete");
      await user?.reload();
      setEmailId(null);
    }, "Email verified."),
    makePrimary: (id: string) => run(async () => { await setPrimary(id); }, "Primary email updated."),
    connectGoogle: () => run(async () => {
      const account = await createGoogle();
      const redirect = account.verification?.externalVerificationRedirectURL;
      if (!redirect) throw new Error("Google connection unavailable");
      window.location.assign(redirect.href);
    }, ""),
  };
}
