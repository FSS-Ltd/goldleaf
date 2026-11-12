"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/portal/require-role";
import { saveBillingSettings } from "@/lib/portal/billing-settings";
import {
  issueInvoice,
  previewInvoice,
  createInvoiceDraft,
  readPaymentOperation,
  listInvoicePaymentIntents,
  prepareInvoicePayment,
  completeInvoicePayment,
} from "@/lib/portal/invoices";
import {
  deliverInvoiceNotification,
  prepareInvoiceNotifications,
} from "@/lib/portal/invoice-notifications";
import { paymentInputSchema } from "@/lib/portal/invoice-schemas";
import { paymentMatches } from "@/lib/portal/payment-retry";
import { parseDecimalMinorUnits } from "@/lib/portal/decimal-input";
import {
  BillingConfigurationError,
  InvoiceQuoteMismatchError,
} from "@/lib/portal/invoice-quote";
import { InvoiceContextChangedError } from "@/lib/portal/invoice-errors";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
};
const optional = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const required = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";
function invoiceError(error: unknown): string {
  if (
    error instanceof BillingConfigurationError ||
    error instanceof InvoiceQuoteMismatchError ||
    error instanceof InvoiceContextChangedError
  )
    return error.message;
  if (error instanceof z.ZodError)
    return "Check the invoice details and try again.";
  return "We could not complete this request. Please check the details and try again.";
}
export async function updateBillingSettings(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireRole("admin");
    const vatEnabled = form.get("vatEnabled") === "on";
    const vatRate = optional(form.get("vatRate"));
    const days = optional(form.get("paymentTermsDays"));
    if (days !== null && !/^\d{1,4}$/.test(days))
      throw new Error("Invalid terms");
    await saveBillingSettings({
      issuerName: required(form.get("issuerName")),
      issuerAddress: required(form.get("issuerAddress")),
      issuerContact: required(form.get("issuerContact")),
      vatEnabled,
      vatRateBasisPoints:
        vatRate === null ? null : parseDecimalMinorUnits(vatRate, 10000),
      vatRegistration: optional(form.get("vatRegistration")),
      paymentTermsDays: days === null ? null : Number(days),
      paymentMethod: optional(form.get("paymentMethod")),
      billingCadence: optional(form.get("billingCadence")),
      foundingTransitionDate: optional(form.get("foundingTransitionDate")),
    });
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing-settings");
    return { status: "success", message: "Billing settings saved." };
  } catch {
    return {
      status: "error",
      message: "Settings could not be saved. Check the fields and try again.",
    };
  }
}
export async function previewDraft(input: unknown) {
  try {
    await requireRole("admin");
    return { status: "success" as const, quote: await previewInvoice(input) };
  } catch (error) {
    return { status: "error" as const, message: invoiceError(error) };
  }
}
export async function saveDraft(input: unknown, fingerprint: unknown) {
  try {
    await requireRole("admin");
    const id = await createInvoiceDraft(input, fingerprint);
    revalidatePath("/admin/invoices");
    return { status: "success" as const, id };
  } catch (error) {
    return { status: "error" as const, message: invoiceError(error) };
  }
}
export async function issueSavedInvoice(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireRole("admin");
    const id = z.string().uuid().parse(form.get("invoiceId"));
    if (form.get("confirm") !== "on")
      throw new Error("Issue confirmation required");
    await issueInvoice(id, form.get("fingerprint"));
    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
    return {
      status: "success",
      message: "Invoice issued. You can now notify the parent.",
    };
  } catch (error) {
    return { status: "error", message: invoiceError(error) };
  }
}
export async function saveExternalPayment(input: unknown) {
  const parsed = paymentInputSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error" as const, message: "Check the payment details." };
  try {
    await requireRole("admin");
    const state = await prepareInvoicePayment(parsed.data);
    const final =
      state === "pending"
        ? await completeInvoicePayment(
            parsed.data.invoiceId,
            parsed.data.operationId,
          )
        : state;
    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
    revalidatePath("/parent/billing");
    return final === "recorded"
      ? { status: "success" as const, message: "Payment recorded." }
      : {
          status: "rejected" as const,
          message:
            "The payment could not be recorded because the balance changed.",
        };
  } catch (error) {
    const failure = z
      .object({ code: z.literal("22023"), message: z.string() })
      .safeParse(error);
    if (
      failure.success &&
      failure.data.message.includes("invalid payment amount")
    ) {
      return {
        status: "rejected" as const,
        message:
          "The payment exceeds the remaining balance. Refresh the invoice and check the amount.",
      };
    }
    const duplicate = z
      .object({ code: z.literal("23505"), message: z.string() })
      .safeParse(error);
    if (
      duplicate.success &&
      duplicate.data.message.includes("one_pending_payment_per_invoice")
    ) {
      revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
      return {
        status: "rejected" as const,
        message:
          "Another payment is awaiting completion. Review it before recording a new payment.",
      };
    }
    try {
      const recorded = await readPaymentOperation(
        parsed.data.invoiceId,
        parsed.data.operationId,
      );
      if (paymentMatches(parsed.data, recorded)) {
        revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
        revalidatePath("/parent/billing");
        return {
          status: "success" as const,
          message: "Payment was already recorded.",
        };
      }
    } catch {
      /* Preserve the operation for an explicit retry. */
    }
    revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
    return {
      status: "uncertain" as const,
      message:
        "Payment was not confirmed. Retry the same payment or check its status.",
    };
  }
}
export async function checkPayment(input: unknown) {
  const parsed = paymentInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "uncertain" as const,
      message: "The saved payment details are unavailable.",
    };
  try {
    await requireRole("admin");
    const intents = await listInvoicePaymentIntents(parsed.data.invoiceId);
    const intent = intents.find(
      (item) => item.operation_id === parsed.data.operationId,
    );
    if (intent && !paymentMatches(parsed.data, intent))
      return {
        status: "uncertain" as const,
        message:
          "A different payment uses this reference. Contact support before retrying.",
      };
    const recorded = await readPaymentOperation(
      parsed.data.invoiceId,
      parsed.data.operationId,
    );
    if (paymentMatches(parsed.data, recorded)) {
      revalidatePath(`/admin/invoices/${parsed.data.invoiceId}`);
      revalidatePath("/parent/billing");
      return {
        status: "success" as const,
        message: "Payment was already recorded.",
      };
    }
    if (intent?.status === "rejected")
      return {
        status: "rejected" as const,
        message: "This payment was rejected because the balance changed.",
      };
    return {
      status: "not-found" as const,
      message: intent
        ? "This payment is awaiting completion. Retry the same payment."
        : "No matching payment is recorded yet. Keep these details and retry the same payment.",
    };
  } catch {
    return {
      status: "uncertain" as const,
      message:
        "Payment status could not be checked. Keep the same details for a retry.",
    };
  }
}
export async function resumePayment(invoiceId: unknown, operationId: unknown) {
  try {
    await requireRole("admin");
    const invoice = z.string().uuid().parse(invoiceId);
    const operation = z.string().uuid().parse(operationId);
    const state = await completeInvoicePayment(invoice, operation);
    revalidatePath(`/admin/invoices/${invoice}`);
    revalidatePath("/admin/invoices");
    revalidatePath("/parent/billing");
    return state === "recorded"
      ? { status: "success" as const, message: "Payment recorded." }
      : {
          status: "rejected" as const,
          message: "Payment was rejected because the balance changed.",
        };
  } catch {
    return {
      status: "uncertain" as const,
      message:
        "Payment status could not be confirmed. Retry this same payment.",
    };
  }
}
export async function notifyParent(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireRole("admin");
    const invoiceId = z.string().uuid().parse(form.get("invoiceId"));
    const notificationId = z.string().uuid().parse(form.get("notificationId"));
    const status = await deliverInvoiceNotification({
      invoiceId,
      notificationId,
      acceptDuplicate: form.get("acceptDuplicate") === "on",
    });
    revalidatePath(`/admin/invoices/${invoiceId}`);
    return status === "sent"
      ? {
          status: "success",
          message: "Notification accepted by the email provider.",
        }
      : status === "uncertain"
        ? {
            status: "error",
            message:
              "Email delivery could not be confirmed. A retry may be needed.",
          }
        : {
            status: "error",
            message:
              "The notification could not be started. Check the recipient and email configuration; any earlier attempt may still have sent.",
          };
  } catch {
    return {
      status: "error",
      message:
        "Notification status could not be confirmed. Check its status before retrying.",
    };
  }
}
export async function prepareNotifications(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireRole("admin");
    const id = z.string().uuid().parse(form.get("invoiceId"));
    await prepareInvoiceNotifications(id);
    revalidatePath(`/admin/invoices/${id}`);
    return { status: "success", message: "Parent notification list updated." };
  } catch {
    return {
      status: "error",
      message: "Parent notifications could not be updated.",
    };
  }
}
