"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { z } from "zod";
import type { billingSettingsRowSchema } from "@/lib/portal/billing-settings-schema";
import { draftInputSchema } from "@/lib/portal/invoice-schemas";
import type { previewInvoice } from "@/lib/portal/invoices";
import {
  previewDraft,
  saveDraft,
} from "@/app/(portal)/(provider)/admin/invoices/actions";
import { button, card, field, secondary } from "./format";
import { DraftLineEditor, type DraftLineInput } from "./DraftLineEditor";
import { DraftPreview } from "./DraftPreview";

type Quote = Awaited<ReturnType<typeof previewInvoice>>;
type Settings = z.infer<typeof billingSettingsRowSchema>;
type Family = { id: string; display_name: string | null };

export function DraftComposer({
  families,
  settings,
  initialOperationId,
}: {
  families: Family[];
  settings: Settings;
  initialOperationId: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<"recipient" | "services">("recipient");
  const [busy, startTransition] = useTransition();
  const [operation, setOperation] = useState<"preview" | "save">("preview");
  const [operationId, setOperationId] = useState(initialOperationId);
  const [familyId, setFamilyId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [lines, setLines] = useState<DraftLineInput[]>([
    {
      key: "first",
      description: "",
      quantity: "",
      days: "",
      cadence: settings.billing_cadence ?? "",
      serviceDate: "",
    },
  ]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  function changed() {
    setQuote(null);
    setMessage("");
    setOperationId(crypto.randomUUID());
  }
  function updateLine(
    key: string,
    fieldName: keyof Omit<DraftLineInput, "key">,
    value: string,
  ) {
    changed();
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, [fieldName]: value } : line,
      ),
    );
  }
  function input() {
    return {
      operationId,
      quantityIntent: "children-v1",
      familyId,
      recipientName,
      recipientAddress,
      lines: lines.map(
        ({ description, quantity, days, cadence, serviceDate }) => ({
          description,
          quantity: Number(quantity),
          days: Number(days),
          cadence,
          serviceDate,
        }),
      ),
    };
  }
  const valid = draftInputSchema.safeParse(input()).success;
  function preview() {
    if (
      lines.some(
        (line) => !/^\d+$/.test(line.quantity) || !/^[1-5]$/.test(line.days),
      )
    ) {
      setMessage("Enter a quantity and days per week for every line.");
      return;
    }
    setOperation("preview");
    startTransition(async () => {
      try {
        const result = await previewDraft(input());
        if (result.status === "success") {
          setQuote(result.quote);
          setMessage("");
          dialog.current?.showModal();
        } else {
          setQuote(null);
          setMessage(result.message);
        }
      } catch {
        setMessage("The quote could not be confirmed. Please try again.");
      }
    });
  }
  function save() {
    if (!quote) return;
    setOperation("save");
    startTransition(async () => {
      try {
        const result = await saveDraft(input(), quote.fingerprint);
        if (result.status === "success")
          router.push(`/admin/invoices/${result.id}`);
        else {
          setQuote(null);
          setMessage(result.message);
        }
      } catch {
        setMessage(
          "The draft could not be confirmed. Retry without changing the details or check the invoice list.",
        );
      }
    });
  }
  return (
    <section className={card} aria-labelledby="compose-heading">
      <h2 id="compose-heading" className="!text-2xl">
        Create an invoice draft
      </h2>
      <p className="mt-2 text-sm text-[#35594a]">
        Enter the service details, then review the quote before saving.
      </p>
      <div className="mt-6">
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {step === "recipient" && (
            <>
              <label className="block text-sm">
                Family
                <select
                  className={field}
                  required
                  value={familyId}
                  onChange={(event) => {
                    changed();
                    setFamilyId(event.target.value);
                  }}
                >
                  <option value="">Select a family</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.display_name ?? "Unnamed family"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Recipient name
                  <input
                    className={field}
                    required
                    value={recipientName}
                    onChange={(event) => {
                      changed();
                      setRecipientName(event.target.value);
                    }}
                    maxLength={200}
                  />
                </label>
                <label className="text-sm">
                  Recipient address
                  <input
                    className={field}
                    required
                    value={recipientAddress}
                    onChange={(event) => {
                      changed();
                      setRecipientAddress(event.target.value);
                    }}
                    maxLength={1000}
                  />
                </label>
              </div>
              <button
                type="button"
                className={button}
                disabled={!familyId || !recipientName.trim() || !recipientAddress.trim()}
                onClick={() => setStep("services")}
              >
                Continue to services
              </button>
            </>
          )}
          {step === "services" && (
            <>
              {lines.map((line, index) => (
                <DraftLineEditor
                  key={line.key}
                  line={line}
                  index={index}
                  canRemove={lines.length > 1}
                  onChange={(name, value) => updateLine(line.key, name, value)}
                  onRemove={() => {
                    changed();
                    setLines((current) =>
                      current.filter((item) => item.key !== line.key),
                    );
                  }}
                />
              ))}
              <button
                type="button"
                className={secondary}
                onClick={() => {
                  changed();
                  setLines((current) => [
                    ...current,
                    {
                      key: crypto.randomUUID(),
                      description: "",
                      quantity: "",
                      days: "",
                      cadence: settings.billing_cadence ?? "",
                      serviceDate: "",
                    },
                  ]);
                }}
                disabled={lines.length >= 100}
              >
                Add line
              </button>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={secondary} onClick={() => setStep("recipient")}>
                  Back
                </button>
                <button
                  type="button"
                  className={secondary}
                  ref={previewButton}
                  onClick={preview}
                  disabled={!valid}
                >
                  {busy && operation === "preview"
                    ? "Preparing quote…"
                    : "Preview quote"}
                </button>
              </div>
            </>
          )}
          <p className="text-xs text-[#5a6a5e]">
            Save the draft before issuing it.
          </p>
          {message && (
            <p role="status" className="text-sm text-[#35594a]">
              {message}
            </p>
          )}
        </fieldset>
        <dialog
          ref={dialog}
          onClose={() => previewButton.current?.focus()}
          aria-labelledby="invoice-review-title"
          className="m-auto max-h-[90dvh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl backdrop:bg-black/50 sm:p-6"
          onCancel={(event) => { if (busy) event.preventDefault(); }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="invoice-review-title" className="!text-xl">
              Review invoice
            </h2>
            <button type="button" className={secondary} disabled={busy} onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>
          <DraftPreview
            quote={quote}
            settings={settings}
            recipientName={recipientName}
            recipientAddress={recipientAddress}
          />
          {message && <p role="status" className="mt-3 text-sm">{message}</p>}
          <button type="button" className={`${button} mt-4`} onClick={save} disabled={busy || !quote}>
            {busy && operation === "save" ? "Saving draft…" : "Save draft"}
          </button>
        </dialog>
      </div>
    </section>
  );
}
