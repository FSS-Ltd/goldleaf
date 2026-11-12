"use client";

import { useActionState, useState } from "react";
import {
  updateBillingSettings,
  type ActionState,
} from "@/app/(portal)/(provider)/admin/invoices/actions";
import type { z } from "zod";
import type { billingSettingsRowSchema } from "@/lib/portal/billing-settings-schema";
import { button, card, field, subcard } from "./format";
import { billingSettingsStatus } from "@/lib/portal/billing-settings-status";

type Settings = z.infer<typeof billingSettingsRowSchema>;
const initial: ActionState = { status: "idle", message: "" };
export function BillingSettingsForm({
  settings,
  showHeading = true,
}: {
  settings: Settings;
  showHeading?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: ActionState, form: FormData) => {
      const result = await updateBillingSettings(previous, form);
      if (result.status === "success") setDirty(false);
      return result;
    },
    initial,
  );
  const [fields, setFields] = useState({
    issuerName: settings.issuer_name,
    issuerAddress: settings.issuer_address,
    issuerContact: settings.issuer_contact,
    paymentTermsDays: String(settings.payment_terms_days ?? ""),
    billingCadence: settings.billing_cadence ?? "",
    paymentMethod: settings.payment_method ?? "",
    foundingTransitionDate: settings.founding_transition_date ?? "",
  });
  const [vat, setVat] = useState(settings.vat_enabled);
  const [rate, setRate] = useState(
    settings.vat_rate_basis_points === null
      ? ""
      : (settings.vat_rate_basis_points / 100).toFixed(2),
  );
  const [registration, setRegistration] = useState(
    settings.vat_registration ?? "",
  );
  const GroupHeading = showHeading ? "h3" : "h2";
  return (
    <section
      className={card}
      aria-label={showHeading ? undefined : "Billing settings form"}
      aria-labelledby={showHeading ? "settings-title" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3d7c3] pb-4">
        {showHeading && (
          <h2 id="settings-title" className="!text-2xl">
            Billing settings
          </h2>
        )}
        <span className="text-xs text-[#35594a]">
          {billingSettingsStatus(pending, dirty, state.status === "error")}
        </span>
      </div>
      <form action={action} onChange={() => setDirty(true)} className="mt-6">
        <fieldset
          disabled={pending}
          className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"
        >
          <div className="space-y-5">
            <div className={subcard}>
              <GroupHeading className="!font-sans !text-xs font-semibold uppercase tracking-wide">
                Issuer details
              </GroupHeading>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Legal name
                  <input
                    className={field}
                    name="issuerName"
                    value={fields.issuerName}
                    onChange={(event) =>
                      setFields({ ...fields, issuerName: event.target.value })
                    }
                    maxLength={200}
                    required
                  />
                </label>
                <label className="text-sm">
                  Address
                  <input
                    className={field}
                    name="issuerAddress"
                    value={fields.issuerAddress}
                    onChange={(event) =>
                      setFields({
                        ...fields,
                        issuerAddress: event.target.value,
                      })
                    }
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
                  value={fields.issuerContact}
                  onChange={(event) =>
                    setFields({ ...fields, issuerContact: event.target.value })
                  }
                  maxLength={1000}
                  required
                />
              </label>
            </div>
            <div className={subcard}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <GroupHeading className="!font-sans !text-xs font-semibold uppercase tracking-wide">
                    VAT
                  </GroupHeading>
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
              {vat && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    VAT rate (%)
                    <input
                      className={field}
                      name="vatRate"
                      inputMode="decimal"
                      value={rate}
                      onChange={(event) => setRate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm">
                    VAT registration number
                    <input
                      className={field}
                      name="vatRegistration"
                      value={registration}
                      onChange={(event) => setRegistration(event.target.value)}
                      required
                      maxLength={100}
                    />
                  </label>
                </div>
              )}
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
            <GroupHeading className="!font-sans !text-xs font-semibold uppercase tracking-wide">
              Payment and billing
            </GroupHeading>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Payment due after (days)
                <input
                  className={field}
                  name="paymentTermsDays"
                  type="number"
                  min="0"
                  max="3650"
                  value={fields.paymentTermsDays}
                  onChange={(event) =>
                    setFields({
                      ...fields,
                      paymentTermsDays: event.target.value,
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Billing cadence
                <select
                  className={field}
                  name="billingCadence"
                  value={fields.billingCadence}
                  onChange={(event) =>
                    setFields({ ...fields, billingCadence: event.target.value })
                  }
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
                value={fields.paymentMethod}
                onChange={(event) =>
                  setFields({ ...fields, paymentMethod: event.target.value })
                }
              />
            </label>
            <label className="mt-4 block text-sm">
              Founding transition date
              <input
                className={field}
                name="foundingTransitionDate"
                type="date"
                value={fields.foundingTransitionDate}
                onChange={(event) =>
                  setFields({
                    ...fields,
                    foundingTransitionDate: event.target.value,
                  })
                }
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
