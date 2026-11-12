"use client";

import { useActionState } from "react";
import {
  issueSavedInvoice,
  notifyParent,
  prepareNotifications,
  type ActionState,
} from "@/app/(portal)/(provider)/admin/invoices/actions";
import { button, secondary } from "./format";

const initial: ActionState = { status: "idle", message: "" };
export function IssueForm({
  invoiceId,
  fingerprint,
}: {
  invoiceId: string;
  fingerprint: string;
}) {
  const [state, action, pending] = useActionState(issueSavedInvoice, initial);
  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="fingerprint" value={fingerprint} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" required className="mt-1" />{" "}
        Issuing fixes the invoice details.
      </label>
      <button className={button} disabled={pending}>
        {pending ? "Issuing…" : "Issue invoice"}
      </button>
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function NotificationForm({
  invoiceId,
  notificationId,
  mayDuplicate,
  status,
}: {
  invoiceId: string;
  notificationId: string;
  mayDuplicate: boolean;
  status: string;
}) {
  const [state, action, pending] = useActionState(notifyParent, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="notificationId" value={notificationId} />
      {mayDuplicate && (
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            name="acceptDuplicate"
            required
          />{" "}
          An earlier email may have been sent. I understand retrying may send
          another.
        </label>
      )}
      <button className={secondary} disabled={pending || status === "sent"}>
        {pending
          ? "Sending…"
          : status === "sent"
            ? "Provider accepted"
            : status === "pending"
              ? "Send notification"
              : "Retry notification"}
      </button>
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function PrepareNotifications({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(
    prepareNotifications,
    initial,
  );
  return (
    <form action={action}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button className={secondary} disabled={pending}>
        {pending ? "Checking…" : "Update parent list"}
      </button>
      {state.message && (
        <p role="status" className="mt-2 text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
