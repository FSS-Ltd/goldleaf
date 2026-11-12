import { createHash } from "node:crypto";
import { InvoiceContextChangedError } from "./invoice-errors";

export function invoiceFingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertInvoiceFingerprint(expected: string, value: unknown): void {
  if (invoiceFingerprint(value) !== expected) throw new InvoiceContextChangedError();
}
