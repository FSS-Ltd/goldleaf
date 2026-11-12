"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendEnquiry, type EnquiryState } from "@/app/(public)/enquire/actions";
import { site } from "@/content/site";

const initial: EnquiryState = { status: "idle" };

function Choice({ name, value, label, checked, describedBy }: { name: string; value: string; label: string; checked: boolean; describedBy?: string }) {
  return (
    <label className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-ink-soft bg-white px-5 font-medium has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-clay">
      <input type="radio" name={name} value={value} defaultChecked={checked} aria-describedby={describedBy} className="sr-only" />
      {label}
    </label>
  );
}

export function EnquiryForm() {
  const [state, action, pending] = useActionState(sendEnquiry, initial);
  const errors = state.status === "error" ? state.errors : {};
  const v = state.status === "error" ? state.values : {};
  const err = (k: keyof typeof errors) => errors[k];

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-card border-2 border-ink bg-paper-deep p-8">
        <h2 className="!text-3xl">Thank you</h2>
        <p className="mt-3">{site.tutor.firstName} will reply within 2 working days.</p>
        <p className="mt-3 text-ink-soft">
          Meanwhile, see <Link href="/how-we-teach" className="link-u">how a session works</Link>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="grid gap-6">
      {state.status === "error" && (state.message || Object.keys(errors).length > 0) && (
        <div role="alert" className="rounded-card border-2 border-[#a1231b] bg-white p-4">
          {state.message ? (
            <p>
              Sorry, your enquiry did not send.{" "}
              {site.contactEmail ? (
                <>
                  Please email <a className="font-semibold underline" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> instead.
                </>
              ) : (
                "Please try again in a few minutes."
              )}
            </p>
          ) : (
            <p>Please check the fields marked below.</p>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" defaultValue={v.name} className="input" aria-invalid={!!err("name")} aria-describedby={err("name") ? "err-name" : undefined} />
        {err("name") && <p id="err-name" className="err">{err("name")}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v.email} className="input" aria-invalid={!!err("email")} aria-describedby={err("email") ? "err-email" : undefined} />
          {err("email") && <p id="err-email" className="err">{err("email")}</p>}
        </div>
        <div className="field">
          <label htmlFor="phone">Phone <span className="font-normal text-ink-soft">(optional)</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.phone} className="input" />
        </div>
      </div>

      <fieldset className="field">
        <legend>Your child&rsquo;s age</legend>
        <div className="flex flex-wrap gap-3">
          {["2", "3", "4"].map((a) => (
            <Choice key={a} name="childAge" value={a} label={`${a} years`} checked={v.childAge === a} describedBy={err("childAge") ? "err-childAge" : undefined} />
          ))}
        </div>
        {err("childAge") && <p id="err-childAge" className="err">{err("childAge")}</p>}
      </fieldset>

      <fieldset className="field">
        <legend>Days a week you would like</legend>
        <div className="flex flex-wrap gap-3">
          {["1", "2", "3", "4", "5"].map((d) => (
            <Choice key={d} name="days" value={d} label={d} checked={v.days === d} describedBy={err("days") ? "err-days" : undefined} />
          ))}
        </div>
        {err("days") && <p id="err-days" className="err">{err("days")}</p>}
      </fieldset>

      <fieldset className="field">
        <legend>Where would you like sessions</legend>
        <div className="flex flex-wrap gap-3">
          <Choice name="where" value="home" label="At our home" checked={v.where === "home"} describedBy={err("where") ? "err-where" : undefined} />
          <Choice name="where" value="church" label="At the church" checked={v.where === "church"} describedBy={err("where") ? "err-where" : undefined} />
          <Choice name="where" value="unsure" label="Not sure yet" checked={v.where === "unsure"} describedBy={err("where") ? "err-where" : undefined} />
        </div>
        {err("where") && <p id="err-where" className="err">{err("where")}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="area">Your area or postcode district</label>
        <input id="area" name="area" autoComplete="address-level2" placeholder="For example TN23" defaultValue={v.area} className="input" aria-invalid={!!err("area")} aria-describedby={err("area") ? "err-area" : undefined} />
        {err("area") && <p id="err-area" className="err">{err("area")}</p>}
      </div>

      <div className="field">
        <label htmlFor="message">Anything we should know <span className="font-normal text-ink-soft">(optional)</span></label>
        <textarea id="message" name="message" rows={4} defaultValue={v.message} className="input" />
      </div>

      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="field">
        <div>
        <label className="flex cursor-pointer items-start gap-3 !font-normal">
          <input type="checkbox" name="consent" className="mt-1 size-5 flex-none accent-ink" aria-invalid={!!err("consent")} aria-describedby={err("consent") ? "err-consent" : undefined} />
          <span>
            I agree to {site.name} using these details to reply to my enquiry.{" "}
            <Link href="/privacy" className="link-u !py-0">Privacy notice</Link>
          </span>
        </label>
        </div>
        {err("consent") && <p id="err-consent" className="err">{err("consent")}</p>}
      </div>

      <div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
          {pending ? "Sending..." : "Send enquiry"}
        </button>
      </div>
    </form>
  );
}
