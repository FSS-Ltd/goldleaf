"use client";
import { PortalLoading } from "@/components/portal/loading/PortalLoading";

import { useClerk, useSession, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearPaymentStorage, signOutAndClearPaymentStorage } from "@/lib/portal/payment-storage";
import { useEffect, useState, type FormEvent } from "react";
import { AccountVerificationPanel } from "./AccountVerificationPanel";
import { useAccountProfile } from "./useAccountProfile";
import { AccountIdentitySummary } from "./AccountIdentitySummary";

const card = "rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-6";
const input = "mt-2 w-full rounded-lg border border-[#e3d7c3] bg-[#fef8f3] px-4 py-3";
const button = "rounded-lg bg-[#06451d] px-4 py-3 text-sm font-medium text-white disabled:opacity-60";
function values(event: FormEvent<HTMLFormElement>) { event.preventDefault(); return new FormData(event.currentTarget); }
function field(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value : ""; }

export function AccountProfile() {
  const { user, isLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();
  useEffect(() => {
    if (!isLoaded || !sessionLoaded) return;
    try {
      clearPaymentStorage(sessionStorage, user && session ? { userId: user.id, sessionId: session.id } : undefined);
    } catch {
      // Browser storage may be unavailable.
    }
  }, [isLoaded, sessionLoaded, user, session]);
  if (!isLoaded || !sessionLoaded) return <PortalLoading label="Loading your account…" variant="profile" contentOnly />;
  if (!user || !session) return <p>Please <Link className="underline" href="/sign-in">sign in</Link> to view your account.</p>;
  return <AccountProfileContent key={`${session.id}:${user.id}`} />;
}

function AccountProfileContent() {
  const flow = useAccountProfile();
  const { signOut } = useClerk();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState("");
  if (!flow.isLoaded) return <PortalLoading label="Loading your account…" variant="profile" contentOnly />;
  if (!flow.user) return <p>Please <Link className="underline" href="/sign-in">sign in</Link> to view your account.</p>;
  const user = flow.user;
  return <div className="w-full max-w-3xl text-[#1b3022]">
    <h1 className="font-display !text-3xl text-[#06451d]">Account &amp; profile</h1>
    <p className="mt-3 text-[#35594a]">Manage your personal details and sign-in methods.</p>
    <AccountIdentitySummary user={user} pending={flow.pending} connectGoogle={() => void flow.connectGoogle()} />
    {flow.message && <p role="status" className="mt-5 rounded-lg border border-[#e3d7c3] bg-[#fef8f3] p-3 text-sm">{flow.message}</p>}
    <AccountVerificationPanel flow={flow.verification} />
    <div className="mt-6 space-y-5">
      <section className={card}>
        <h2 className="font-display !text-lg text-[#06451d]">Personal details</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => { const data = values(event); void flow.saveName(field(data, "first"), field(data, "last")); }}>
          <label className="block text-sm font-medium">First name<input name="first" autoComplete="given-name" defaultValue={user.firstName ?? ""} className={input} /></label>
          <label className="block text-sm font-medium">Last name<input name="last" autoComplete="family-name" defaultValue={user.lastName ?? ""} className={input} /></label>
          <button className={button} disabled={flow.pending}>Save name</button>
        </form>
      </section>
      <section className={card}>
        <h2 className="font-display !text-lg text-[#06451d]">Email addresses</h2>
        <ul className="mt-4 space-y-4">{user.emailAddresses.map((email) => <li key={email.id} className="rounded-lg bg-[#fef8f3] p-4 text-sm">
          <p className="break-all font-medium">{email.emailAddress}</p><p className="mt-1 text-[#35594a]">{email.verification?.status === "verified" ? "Verified" : "Not verified"}{user.primaryEmailAddressId === email.id ? " · Primary" : ""}</p>
          {email.verification?.status !== "verified" && <button type="button" disabled={flow.pending} onClick={() => void flow.sendEmailCode(email.id)} className="mt-2 underline">Verify email</button>}
          {email.verification?.status === "verified" && user.primaryEmailAddressId !== email.id && <button type="button" disabled={flow.pending} onClick={() => void flow.makePrimary(email.id)} className="mt-2 underline">Make primary</button>}
        </li>)}</ul>
        {flow.emailId && <form className="mt-4 space-y-3" onSubmit={(event) => { const data = values(event); void flow.verifyEmail(field(data, "code")); }}><label className="block text-sm font-medium">Verification code<input name="code" autoComplete="one-time-code" required className={input} /></label><button className={button} disabled={flow.pending}>Verify email</button></form>}
        <form className="mt-5 space-y-3" onSubmit={(event) => { const data = values(event); void flow.addEmail(field(data, "email")); }}><label className="block text-sm font-medium">Add email address<input name="email" type="email" autoComplete="email" required className={input} /></label><button className={button} disabled={flow.pending}>Add email</button></form>
      </section>
      <section className={card}>
        <h2 className="font-display !text-lg text-[#06451d]">Password</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => { const data = values(event); void flow.savePassword(field(data, "current"), field(data, "next")); event.currentTarget.reset(); }}>
          {user.passwordEnabled && <label className="block text-sm font-medium">Current password<input name="current" type="password" autoComplete="current-password" required className={input} /></label>}
          <label className="block text-sm font-medium">New password<input name="next" type="password" autoComplete="new-password" required className={input} /></label>
          <button className={button} disabled={flow.pending}>Update password</button>
        </form>
      </section>
      <button type="button" onClick={() => void signOutAndClearPaymentStorage(() => signOut(), () => sessionStorage).then(() => { router.push("/sign-in"); router.refresh(); }).catch(() => setSignOutError("Could not sign out. Please try again."))} className="text-sm font-medium text-[#9e2a2b] underline">Sign out</button>
      {signOutError && <p role="alert" className="text-sm">{signOutError}</p>}
    </div>
  </div>;
}
