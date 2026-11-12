"use client";

import { button, field, pounds } from "./format";
import { usePaymentRecovery, type PendingIntent } from "./usePaymentRecovery";

export function PaymentForm({
  invoiceId,
  remaining,
  pendingIntent,
}: {
  invoiceId: string;
  remaining: number;
  pendingIntent: PendingIntent | null;
}) {
  const {
    pending,
    operation,
    saved,
    ready,
    storageInvalid,
    amount,
    setAmount,
    date,
    setDate,
    reference,
    setReference,
    message,
    valid,
    submit,
    check,
    resume,
    sessionId,
    userId,
  } = usePaymentRecovery({ invoiceId, remaining, pendingIntent });
  return (
    <section aria-labelledby="payment-heading">
      <h2 id="payment-heading" className="!text-xl">
        Record external payment
      </h2>
      <p className="mt-2 text-sm text-[#35594a]">
        Outstanding: <strong>{pounds(remaining)}</strong>
      </p>
      {pendingIntent && (
        <div className="mt-4 rounded-xl border border-[#d7c9b4] bg-[#fffdfa] p-4 text-sm">
          <p className="font-semibold">Payment awaiting completion</p>
          <p className="mt-2">
            {pounds(pendingIntent.amount_pence)} · {pendingIntent.paid_on} ·{" "}
            {pendingIntent.reference}
          </p>
          <p className="mt-2 text-[#35594a]">
            Resume this exact payment before recording another.
          </p>
          <button
            type="button"
            className={`${button} mt-3`}
            onClick={resume}
            disabled={pending || !sessionId || !userId}
          >
            {pending && operation === "record"
              ? "Recording…"
              : "Resume exact payment"}
          </button>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Amount (£)
          <input
            className={field}
            inputMode="decimal"
            value={
              saved ? (saved.payment.amountPence / 100).toFixed(2) : amount
            }
            onChange={(event) => setAmount(event.target.value)}
            disabled={!ready || !!saved || !!pendingIntent || pending}
          />
        </label>
        <label className="text-sm">
          Payment date
          <input
            className={field}
            type="date"
            value={saved?.payment.paidOn ?? date}
            onChange={(event) => setDate(event.target.value)}
            disabled={!ready || !!saved || !!pendingIntent || pending}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        Reference
        <input
          className={field}
          value={saved?.payment.reference ?? reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={500}
          disabled={!ready || !!saved || !!pendingIntent || pending}
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className={button}
          type="button"
          onClick={submit}
          disabled={!ready || pending || !!pendingIntent || (!saved && !valid)}
        >
          {pending && operation === "record"
            ? "Recording…"
            : saved
              ? "Retry same payment"
              : "Record payment"}
        </button>
        {saved && (
          <button
            className="min-h-11 px-3 text-sm underline"
            type="button"
            onClick={check}
            disabled={pending}
          >
            {pending && operation === "check"
              ? "Checking…"
              : "Check payment status"}
          </button>
        )}
      </div>
      {(message || saved || storageInvalid) && (
        <p role="status" className="mt-4 text-sm text-[#35594a]">
          {message ||
            (saved
              ? "A previous payment was not confirmed. Retry or check the same payment."
              : "The saved payment cannot be checked. Do not submit another payment from this tab.")}
        </p>
      )}
    </section>
  );
}
