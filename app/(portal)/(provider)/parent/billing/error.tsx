"use client";
import { InvoiceError } from "@/components/portal/invoices/InvoiceError";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <InvoiceError reset={reset} />;
}
