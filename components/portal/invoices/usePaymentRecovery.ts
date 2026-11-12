"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { z } from "zod";
import {
  saveExternalPayment,
  checkPayment,
  resumePayment,
} from "@/app/(portal)/(provider)/admin/invoices/actions";
import { parseDecimalMinorUnits } from "@/lib/portal/decimal-input";
import { paymentInputSchema } from "@/lib/portal/invoice-schemas";
import { paymentStoragePrefix } from "@/lib/portal/payment-storage";
import { sameSession } from "@/lib/portal/session-binding";

const savedSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  payment: paymentInputSchema,
});
const storageEvent = "goldleaf-payment-storage";
const serverSnapshot = () => null;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageEvent, callback);
  };
}
function decode(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type PendingIntent = {
  operation_id: string;
  amount_pence: number;
  paid_on: string;
  reference: string;
};
export function usePaymentRecovery({
  invoiceId,
  remaining,
  pendingIntent,
}: {
  invoiceId: string;
  remaining: number;
  pendingIntent: PendingIntent | null;
}) {
  const { sessionId, userId, isLoaded } = useAuth();
  const router = useRouter();
  const clerk = useClerk();
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState<"record" | "check">("record");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const storageKey = `${paymentStoragePrefix}${invoiceId}`;
  const snapshot = useCallback(() => {
    try {
      return sessionStorage.getItem(storageKey);
    } catch {
      return "unavailable";
    }
  }, [storageKey]);
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const entry = decode(raw);
  const wrongActor =
    !!entry && isLoaded && !sameSession(entry, sessionId, userId);
  useEffect(() => {
    if (wrongActor) {
      sessionStorage.removeItem(storageKey);
      window.dispatchEvent(new Event(storageEvent));
    }
  }, [wrongActor, storageKey]);
  const saved =
    entry && !wrongActor && entry.payment.invoiceId === invoiceId
      ? entry
      : null;
  const storageInvalid = raw !== null && !saved && !wrongActor;
  const ready =
    isLoaded && !!sessionId && !!userId && !storageInvalid && !wrongActor;
  function clearSaved() {
    sessionStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(storageEvent));
    setAmount("");
    setDate("");
    setReference("");
    router.refresh();
  }
  let valid = false;
  try {
    const pence = parseDecimalMinorUnits(amount, 2147483647);
    valid =
      pence > 0 &&
      pence <= remaining &&
      paymentInputSchema.safeParse({
        invoiceId,
        operationId: "00000000-0000-4000-8000-000000000000",
        amountPence: pence,
        paidOn: date,
        reference,
      }).success;
  } catch {
    valid = false;
  }
  function submit() {
    if (
      !sessionId ||
      !userId ||
      !sameSession({ sessionId, userId }, clerk.session?.id, clerk.user?.id)
    ) {
      setMessage("Sign in again before recording a payment.");
      return;
    }
    let active = saved;
    if (!active) {
      let payment: z.infer<typeof paymentInputSchema>;
      try {
        const pence = parseDecimalMinorUnits(amount, 2147483647);
        if (pence <= 0 || pence > remaining) throw new Error("Invalid amount");
        payment = paymentInputSchema.parse({
          invoiceId,
          operationId: crypto.randomUUID(),
          amountPence: pence,
          paidOn: date,
          reference,
        });
      } catch {
        setMessage(
          "Enter a valid amount no greater than the outstanding balance, a date and a reference.",
        );
        return;
      }
      active = { sessionId, userId, payment };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(active));
        window.dispatchEvent(new Event(storageEvent));
      } catch {
        setMessage(
          "Browser storage is unavailable. The payment was not submitted.",
        );
        return;
      }
    }
    const attempt = active;
    setOperation("record");
    startTransition(async () => {
      try {
        const result = await saveExternalPayment(attempt.payment);
        if (!sameSession(attempt, clerk.session?.id, clerk.user?.id)) return;
        setMessage(result.message);
        if (result.status === "success") clearSaved();
        else if (result.status === "rejected") {
          sessionStorage.removeItem(storageKey);
          window.dispatchEvent(new Event(storageEvent));
          router.refresh();
        }
      } catch {
        if (sameSession(attempt, clerk.session?.id, clerk.user?.id))
          setMessage(
            "Payment was not confirmed. Retry or check the same payment.",
          );
      }
    });
  }
  function check() {
    if (!saved) return;
    const attempt = saved;
    setOperation("check");
    startTransition(async () => {
      try {
        const result = await checkPayment(attempt.payment);
        if (!sameSession(attempt, clerk.session?.id, clerk.user?.id)) return;
        setMessage(result.message);
        if (result.status === "success" || result.status === "rejected")
          clearSaved();
      } catch {
        if (sameSession(attempt, clerk.session?.id, clerk.user?.id))
          setMessage(
            "Payment status could not be checked. Keep the same details for a retry.",
          );
      }
    });
  }
  function resume() {
    if (!pendingIntent || !sessionId || !userId) return;
    const current = { sessionId, userId };
    setOperation("record");
    startTransition(async () => {
      try {
        const result = await resumePayment(
          invoiceId,
          pendingIntent.operation_id,
        );
        if (!sameSession(current, clerk.session?.id, clerk.user?.id)) return;
        setMessage(result.message);
        if (result.status === "success" || result.status === "rejected") {
          if (saved?.payment.operationId === pendingIntent.operation_id)
            clearSaved();
          else router.refresh();
        }
      } catch {
        if (sameSession(current, clerk.session?.id, clerk.user?.id))
          setMessage(
            "Payment status could not be confirmed. Retry the same payment.",
          );
      }
    });
  }
  return {
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
  };
}
