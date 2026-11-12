"use client";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";

import { useClerk, useReverification } from "@clerk/nextjs";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AccountVerificationPanel } from "./AccountVerificationPanel";
import { useAccountVerification } from "./useAccountVerification";
import { assertSession, type SessionBinding } from "@/lib/portal/session-binding";

export function ResetPasswordTask({ destination }: { destination: "/portal" | "/invite/accept" }) {
  const clerk = useClerk();
  const verification = useAccountVerification();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const updatePassword = useReverification(async (newPassword: string, binding: SessionBinding) => {
    assertSession(binding, clerk.session?.id, clerk.user?.id);
    if (!clerk.user) throw new Error("Account unavailable");
    return clerk.user.updatePassword({ newPassword, signOutOfOtherSessions: true });
  }, { onNeedsReverification: verification.onNeedsReverification });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    if (typeof password !== "string" || !password || !clerk.session || !clerk.user || inFlight.current) return;
    const actor = { sessionId: clerk.session.id, userId: clerk.user.id };
    event.currentTarget.reset();
    inFlight.current = true;
    setPending(true);
    setMessage("");
    try {
      const binding = verification.bind(actor);
      await updatePassword(password, binding);
      assertSession(binding, clerk.session?.id, clerk.user?.id);
      await clerk.setActive({ session: binding.sessionId, navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setMessage("Your account needs another security step. Please contact Goldleaf for help.");
          return;
        }
        if (!session || session.id !== binding.sessionId || session.status !== "active") {
          setMessage("Your session is not ready. Please sign in again.");
          return;
        }
        window.location.assign(decorateUrl(destination));
      } });
    } catch {
      setMessage("We could not update your password. Please check it meets the requirements and try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (!clerk.loaded) return <PortalLoading label="Loading your account…" variant="account" contentOnly />;
  if (!clerk.session || !clerk.user) return <p>Your session is unavailable. Please <Link href="/sign-in" className="underline">sign in</Link> again.</p>;
  if (clerk.session.currentTask?.key !== "reset-password") {
    const ready = !clerk.session.currentTask && clerk.session.status === "active";
    return <div><h1 className="font-display !text-2xl">Account security</h1><p className="mt-3">{ready ? "Your account is ready." : "Your account needs another security step. Please contact Goldleaf for help."}</p>{ready && <a href={destination} className="mt-4 inline-block underline">Continue</a>}</div>;
  }
  return <section className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-7 text-[#1b3022]">
    <h1 className="font-display !text-2xl text-[#06451d]">Choose a new password</h1>
    <p className="mt-3 text-sm text-[#35594a]">For your account security, please update your password before continuing.</p>
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    <AccountVerificationPanel flow={verification} />
    <form key={verification.actorKey} onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
      <label className="block text-sm font-medium">New password<input name="password" type="password" autoComplete="new-password" required className="mt-2 w-full rounded-lg border border-[#e3d7c3] bg-[#fef8f3] px-4 py-3" /></label>
      <button disabled={pending} className="w-full rounded-lg bg-[#06451d] px-5 py-3 font-semibold text-white disabled:opacity-60">Update password</button>
    </form>
  </section>;
}
