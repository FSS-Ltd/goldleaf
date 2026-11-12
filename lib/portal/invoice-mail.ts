type Message = { from: string; to: string; subject: string; text: string };
type Result = { data: { id: string } | null; error: unknown };

export async function sendInvoiceMail(
  send: (message: Message, options: { idempotencyKey: string }) => Promise<Result>,
  input: { from: string; to: string; origin: string; invoiceId: string; familyId: string; attemptId: string; requireHttps: boolean },
): Promise<"sent" | "failed" | "uncertain"> {
  let url: URL;
  try {
    url = new URL(`/parent/billing/${input.invoiceId}`, input.origin);
    if ((input.requireHttps && url.protocol !== "https:") || !["http:", "https:"].includes(url.protocol) || url.username || url.password) return "failed";
    url.searchParams.set("family", input.familyId);
  } catch { return "failed"; }
  try {
    const result = await send({ from: input.from, to: input.to, subject: "Your Goldleaf invoice", text: `Your invoice is ready. Sign in to view it:\n\n${url.href}` }, { idempotencyKey: `invoice/${input.attemptId}` });
    return !result.error && result.data?.id ? "sent" : "uncertain";
  } catch { return "uncertain"; }
}
