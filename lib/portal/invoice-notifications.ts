import "server-only";
import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { invoiceIdSchema } from "./invoice-schemas";
import { verifiedIdentity } from "./verified-identity";
import { sendInvoiceMail } from "./invoice-mail";

const noticeSchema = z.object({ id: z.string().uuid(), parent_subject: z.string().min(1), status: z.enum(["pending", "sending", "sent", "failed", "uncertain"]), may_duplicate: z.boolean() });
const claimSchema = z.object({ attempt_id: z.string().uuid(), recipient_email: z.string().email(), sender: z.string().min(1), origin: z.string().url(), invoice_id: z.string().uuid(), family_id: z.string().uuid() });

export async function listInvoiceNotifications(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(noticeSchema).parse(await sql`SELECT * FROM portal.list_invoice_notifications(${userId}, ${invoice})`);
}

export async function prepareInvoiceNotifications(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(noticeSchema).parse(await sql`SELECT * FROM portal.prepare_invoice_notifications(${userId}, ${invoice})`);
}

export async function deliverInvoiceNotification(input: unknown): Promise<"sent" | "failed" | "uncertain" | "not-attempted"> {
  const data = z.strictObject({ invoiceId: z.string().uuid(), notificationId: z.string().uuid(), acceptDuplicate: z.boolean() }).parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const notices = z.array(noticeSchema).parse(await sql`SELECT * FROM portal.prepare_invoice_notifications(${userId}, ${data.invoiceId})`);
  const notice = notices.find((item) => item.id === data.notificationId);
  if (!notice) throw new Error("Notification unavailable");
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PORTAL_INVOICE_FROM_EMAIL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let origin: string | undefined;
  try {
    const url = siteUrl ? new URL(siteUrl) : null;
    if (url && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && (process.env.NODE_ENV !== "production" || url.protocol === "https:")) origin = url.origin;
  } catch { /* Invalid configuration is handled below. */ }
  let recipient: string | undefined;
  if (key && from && origin) {
    try {
      const clerk = await clerkClient();
      const identity = verifiedIdentity(await clerk.users.getUser(notice.parent_subject));
      if (identity?.userId === notice.parent_subject) recipient = identity.verifiedEmails.find((email) => z.email().safeParse(email).success);
    } catch { /* The provider may be temporarily unavailable. */ }
  }
  if (!key || !from || !origin || !recipient) {
    await sql`SELECT portal.fail_invoice_notification(${userId}, ${notice.id})`;
    return "not-attempted";
  }
  const rows = await sql`SELECT * FROM portal.claim_invoice_notification(${userId}, ${notice.id}, ${randomUUID()}, ${recipient}, ${from}, ${origin}, ${data.acceptDuplicate})`;
  const claim = z.array(claimSchema).length(1).parse(rows)[0];
  const resend = new Resend(key);
  const status = await sendInvoiceMail((message, options) => resend.emails.send(message, options), {
    from: claim.sender, to: claim.recipient_email, origin: claim.origin, invoiceId: claim.invoice_id,
    familyId: claim.family_id, attemptId: claim.attempt_id, requireHttps: process.env.NODE_ENV === "production",
  });
  await sql`SELECT portal.finish_invoice_notification(${userId}, ${notice.id}, ${claim.attempt_id}, ${status})`;
  return status;
}
