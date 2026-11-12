"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useSignUpFlow } from "./useSignUpFlow";
import { useSignInFlow } from "./useSignInFlow";
import { ProtectGate } from "./ProtectGate";
import { GoogleButton } from "./GoogleButton";

const input = "mt-2 w-full rounded-lg border border-[#e3d7c3] bg-[#fef8f3] px-4 py-3 text-[#1b3022]";
const button = "w-full rounded-lg bg-[#06451d] px-5 py-3 font-semibold text-white disabled:opacity-60";

export function SignUpForm() {
  const flow = useSignUpFlow();
  const google = useSignInFlow("/invite/accept");
  function values(event: FormEvent<HTMLFormElement>) { event.preventDefault(); return new FormData(event.currentTarget); }
  function field(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value : ""; }
  const pending = flow.pending || google.pending;
  return <section className="w-full max-w-md rounded-[14px] border border-[#e3d7c3] bg-[#f6eee2] p-7 text-[#1b3022] shadow-sm">
    <h1 className="font-display text-3xl text-[#06451d]">{flow.stage === "details" ? "Create your account" : flow.stage === "username" ? "Choose a username" : "Verify your email"}</h1>
    <p className="mt-3 text-sm leading-relaxed text-[#35594a]">{flow.stage === "details" ? "Use the email address your invitation was sent to." : flow.stage === "username" ? "Choose a username to finish setting up your account." : "Enter the code sent to your email, or request one below."}</p>
    {(flow.message || google.message) && <p role="status" className="mt-5 rounded-lg border border-[#e3d7c3] bg-[#fef8f3] p-3 text-sm">{flow.message || google.message}</p>}
    <ProtectGate container={flow.gate.container} active={flow.gate.active} cancel={flow.gate.cancel} /><ProtectGate container={google.gate.container} active={google.gate.active} cancel={google.gate.cancel} />
    {flow.needsProtectCheck && <button type="button" disabled={pending} onClick={() => void flow.continueProtect()} className={`${button} mt-5`}>Continue security check</button>}
    {!flow.needsProtectCheck && (flow.stage === "details" ? <>
      <div className="mt-6"><GoogleButton pending={pending} onClick={() => void google.google()} /></div>
      <div className="my-5 flex items-center gap-3 text-xs uppercase text-[#718277]"><span className="h-px flex-1 bg-[#e3d7c3]" />or<span className="h-px flex-1 bg-[#e3d7c3]" /></div>
      <form className="space-y-4" onSubmit={(event) => { const data = values(event); void flow.create(field(data, "email"), field(data, "password"), field(data, "firstName"), field(data, "lastName")); }}>
        <label className="block text-sm font-medium">First name<input className={input} name="firstName" autoComplete="given-name" required /></label>
        <label className="block text-sm font-medium">Last name<input className={input} name="lastName" autoComplete="family-name" required /></label>
        <label className="block text-sm font-medium">Email<input className={input} name="email" type="email" autoComplete="email" required /></label>
        <label className="block text-sm font-medium">Password<input className={input} name="password" type="password" autoComplete="new-password" required /></label>
        <div id="clerk-captcha" />
        <button className={button} disabled={pending}>Create account</button>
      </form>
      <p className="mt-5 text-sm text-[#35594a]">Already have an account? <Link className="font-medium underline" href="/sign-in?redirect_url=%2Finvite%2Faccept">Sign in</Link></p>
    </> : flow.stage === "username" ? <form className="mt-6 space-y-4" onSubmit={(event) => { const data = values(event); void flow.submitUsername(field(data, "username")); }}>
      <label className="block text-sm font-medium">Username<input className={input} name="username" autoComplete="username" required /></label>
      <button className={button} disabled={pending}>Continue</button>
    </form> : <form className="mt-6 space-y-4" onSubmit={(event) => { const data = values(event); void flow.verify(field(data, "code")); }}>
      <label className="block text-sm font-medium">Verification code<input className={input} name="code" autoComplete="one-time-code" required /></label>
      <button className={button} disabled={pending}>Verify email</button>
      <button type="button" disabled={pending} onClick={() => void flow.resend()} className="text-sm font-medium text-[#06451d] underline">Resend code</button>
    </form>)}
  </section>;
}
