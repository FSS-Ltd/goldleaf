"use client";

import { useActionState, useState } from "react";
import {
  updateBillingSettings,
  type ActionState,
} from "@/app/(portal)/(provider)/admin/invoices/actions";
import type { z } from "zod";
import type { billingSettingsRowSchema } from "@/lib/portal/billing-settings-schema";
import { button, card, field, subcard } from "./format";

type Settings = z.infer<typeof billingSettingsRowSchema>;
const initial: ActionState = { status: "idle", message: "" };
export function BillingSettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(
    updateBillingSettings,
    initial,
  );
  const [vat, setVat] = useState(settings.vat_enabled);
  const [rate, setRate] = useState(
    settings.vat_rate_basis_points === null
      ? ""
      : (settings.vat_rate_basis_points / 100).toFixed(2),
  );
  const [registration, setRegistration] = useState(
    settings.vat_registration ?? "",
  );
  const [dirty, setDirty] = useState(false);
  return (
    <section className={card} aria-labelledby="settings-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3d7c3] pb-4">
        <h2 id="settings-title" className="!text-2xl">
          Billing settings
        </h2>
        <span className="text-xs text-[#35594a]">
          {dirty || state.status === "error"
            ? "Unsaved changes"
            : "Saved settings"}
        </span>
      </div>
      <form
        action={action}
        onChange={() => setDirty(true)}
        onSubmit={() => setDirty(false)}
        className="mt-6"
      >
        <fieldset
          disabled={pending}
          className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"
        >
          <div className="space-y-5">
            <div className={subcard}>
              <h3 className="!font-sans !text-xs font-semibold uppercase tracking-wide">
                Issuer details
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Legal name
                  <input
                    className={field}
                    name="issuerName"
                    defaultValue={settings.issuer_name}
                    maxLength={200}
                    required
                  />
                </label>
                <label className="text-sm">
                  Address
                  <input
                    className={field}
                    name="issuerAddress"
                    defaultValue={settings.issuer_address}
                    maxLength={1000}
                    required
                  />
                </label>
              </div>
              <label className="mt-4 block text-sm">
                Contact details
                <input
                  className={field}
                  name="issuerContact"
                  defaultValue={settings.issuer_contact}
                  maxLength={1000}
                  required
                />
              </label>
            </div>
            <div className={subcard}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="!font-sans !text-xs font-semibold uppercase tracking-wide">
                    VAT
                  </h3>
                  <p className="mt-1 text-sm text-[#35594a]">
                    Configure VAT when it applies.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="vatEnabled"
                    checked={vat}
                    onChange={(event) => setVat(event.target.checked)}
                  />{" "}
                  VAT enabled
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  VAT rate (%)
                  <input
                    className={field}
                    name="vatRate"
                    inputMode="decimal"
                    value={rate}
                    onChange={(event) => setRate(event.target.value)}
                    disabled={!vat}
                    required={vat}
                  />
                </label>
                <label className="text-sm">
                  VAT registration number
                  <input
                    className={field}
                    name="vatRegistration"
                    value={registration}
                    onChange={(event) => setRegistration(event.target.value)}
                    disabled={!vat}
                    required={vat}
                    maxLength={100}
                  />
                </label>
              </div>
              {!vat && (
                <>
                  <input type="hidden" name="vatRate" value={rate} />
                  <input
                    type="hidden"
                    name="vatRegistration"
                    value={registration}
                  />
                </>
              )}
            </div>
          </div>
          <div className={subcard}>
            <h3 className="!font-sans !text-xs font-semibold uppercase tracking-wide">
              Payment and billing
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Payment due after (days)
                <input
                  className={field}
                  name="paymentTermsDays"
                  type="number"
                  min="0"
                  max="3650"
                  defaultValue={settings.payment_terms_days ?? ""}
                />
              </label>
              <label className="text-sm">
                Billing cadence
                <select
                  className={field}
                  name="billingCadence"
                  defaultValue={settings.billing_cadence ?? ""}
                >
                  <option value="">Not set</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm">
              Payment instructions
              <textarea
                className={field}
                name="paymentMethod"
                rows={4}
                maxLength={1000}
                defaultValue={settings.payment_method ?? ""}
              />
            </label>
            <label className="mt-4 block text-sm">
              Founding transition date
              <input
                className={field}
                name="foundingTransitionDate"
                type="date"
                defaultValue={settings.founding_transition_date ?? ""}
              />
            </label>
            <p className="mt-2 text-xs text-[#5a6a5e]">
              A date is needed when issuing founding-rate invoices.
            </p>
            <div className="mt-6 flex justify-end">
              <button className={button} type="submit">
                {pending ? "Saving…" : "Save billing settings"}
              </button>
            </div>
          </div>
        </fieldset>
        {state.message && (
          <p
            role="status"
            className={`mt-4 text-sm ${state.status === "error" ? "text-[#a12626]" : "text-[#35594a]"}`}
          >
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}
