import { z } from "zod";

export class InvoiceContextChangedError extends Error {
  constructor() { super("Invoice pricing context changed; refresh and retry"); }
}

export function translateInvoiceError(error: unknown): unknown {
  const stale = z.object({ code: z.literal("40001"), message: z.string() }).safeParse(error);
  return stale.success && stale.data.message.includes("invoice context changed") ? new InvoiceContextChangedError() : error;
}
