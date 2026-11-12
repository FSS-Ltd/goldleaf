"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import type { AuthFactor } from "@/lib/portal/auth-factor";
import { useSignInFlow } from "./useSignInFlow";
import { ProtectGate } from "./ProtectGate";
import { GoogleButton } from "./GoogleButton";

const input = "mt-2 w-full rounded-lg border border-[#e3d7c3] bg-[#fef8f3] px-4 py-3 text-[#1b3022]";
const button = "w-full rounded-lg bg-[#06451d] px-5 py-3 font-semibold text-white disabled:opacity-60";
const labels: Record<AuthFactor, string> = { email_code: "Email code", phone_code: "Text message code", totp: "Authenticator app", backup_code: "Backup code", passkey: "Passkey" };

export function SignInForm({ destination }: { destination: "/portal" | "/invite/accept" }) {
  const flow = useSignInFlow(destination);
  const clerk = useClerk();
  const [factor, setFactor] = useState<AuthFactor | "">("");
  function values(event: FormEvent<HTMLFormElement>) { event.preventDefault(); return new FormData(event.currentTarget); }
  function field(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value : ""; }

  if (clerk.session?.currentTask?.key === "reset-password") return <section className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-7 text-[#1b3022]"><h1 className="font-display !text-2xl text-[#06451d]">Account security</h1><p className="mt-3 text-sm">Please update your password before continuing.</p><Link href={`/session-task/reset-password?destination=${encodeURIComponent(destination)}`} className="mt-5 inline-block rounded-lg bg-[#06451d] px-5 py-3 font-medium text-white">Continue</Link></section>;

  return <section className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-7 text-[#1b3022] shadow-sm">
    <h1 className="font-display !text-2xl text-[#06451d]">{flow.stage === "password" ? "Sign in to Goldleaf" : flow.stage === "factor" ? "Verify your sign in" : "Reset your password"}</h1>
    <p className="mt-3 text-sm leading-relaxed text-[#35594a]">{flow.stage === "password" ? "Sign in to access your Goldleaf portal." : flow.stage === "factor" ? "Choose a verification method for your account." : "Use your email address to recover your account."}</p>
    {flow.message && <p role="status" className="mt-5 rounded-lg border border-[#e3d7c3] bg-[#fef8f3] p-3 text-sm">{flow.message}</p>}
    <ProtectGate container={flow.gate.container} active={flow.gate.active} cancel={flow.gate.cancel} />
    {flow.needsProtectCheck && <button type="button" disabled={flow.pending} onClick={() => void flow.continueProtect()} className={`${button} mt-5`}>Continue security check</button>}
    {!flow.needsProtectCheck && flow.stage === "password" && <>
      <div className="mt-6"><GoogleButton pending={flow.pending} onClick={() => void flow.google()} /></div>
      <div className="my-5 flex items-center gap-3 text-xs uppercase text-[#718277]"><span className="h-px flex-1 bg-[#e3d7c3]" />or<span className="h-px flex-1 bg-[#e3d7c3]" /></div>
      <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.password(field(data, "email"), field(data, "password")); }}>
        <label className="block text-sm font-medium">Email<input className={input} name="email" type="email" autoComplete="email" required /></label>
        <label className="block text-sm font-medium">Password<input className={input} name="password" type="password" autoComplete="current-password" required /></label>
        <button type="button" onClick={() => flow.setStage("reset-email")} className="text-sm font-medium text-[#06451d] underline">Forgot password?</button>
        <button className={button} disabled={flow.pending}>Sign in</button>
      </form>
      {destination === "/invite/accept" && <p className="mt-5 text-sm text-[#35594a]">New to Goldleaf? <Link href="/sign-up" className="font-medium underline">Create an account</Link></p>}
    </>}
    {!flow.needsProtectCheck && flow.stage === "factor" && <div className="mt-6 space-y-4">
      {flow.factors.length === 0 ? <p className="text-sm">Your account needs another verification method. Please contact Goldleaf for help.</p> : <>
        <label className="block text-sm font-medium">Verification method<select className={input} value={factor} onChange={(event) => { const selected = flow.factors.find((item) => item === event.target.value); setFactor(selected ?? ""); }}><option value="">Choose a method</option>{flow.factors.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
        {(factor === "email_code" || factor === "phone_code") && <button type="button" disabled={flow.pending} onClick={() => void flow.sendFactor(factor)} className="text-sm font-medium underline">Send code</button>}
        {factor && <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.verifyFactor(factor, field(data, "code")); }}>
          {factor !== "passkey" && <label className="block text-sm font-medium">Verification code<input className={input} name="code" autoComplete="one-time-code" required /></label>}
          <button className={button} disabled={flow.pending}>{factor === "passkey" ? "Continue with passkey" : "Verify"}</button>
        </form>}
      </>}
    </div>}
    {!flow.needsProtectCheck && flow.stage.startsWith("reset-") && <div className="mt-6 space-y-4">
      {flow.stage === "reset-email" && <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.sendResetCode(field(data, "email")); }}><label className="block text-sm font-medium">Email<input className={input} name="email" type="email" autoComplete="email" required /></label><button className={button} disabled={flow.pending}>Send verification code</button></form>}
      {flow.stage === "reset-code" && <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.verifyResetCode(field(data, "code")); }}><label className="block text-sm font-medium">Verification code<input className={input} name="code" autoComplete="one-time-code" required /></label><button className={button} disabled={flow.pending}>Verify code</button></form>}
      {flow.stage === "reset-password" && <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.resetPassword(field(data, "password")); }}><label className="block text-sm font-medium">New password<input className={input} name="password" type="password" autoComplete="new-password" required /></label><button className={button} disabled={flow.pending}>Reset password</button></form>}
      <button type="button" onClick={() => flow.setStage("password")} className="text-sm font-medium text-[#06451d] underline">Return to sign in</button>
    </div>}
  </section>;
}
