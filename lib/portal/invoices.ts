import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { adminInvoiceRowSchema, draftInputSchema, invoiceIdSchema, issueContextSchema, issuedInvoiceRowSchema, paymentInputSchema, pricingContextSchema } from "./invoice-schemas";
import { translateInvoiceError } from "./invoice-errors";
import { calculateInvoiceTotals, quoteDraftLines, validateIssuanceSettings, verifyInvoiceLines } from "./invoice-quote";

const oneJson = z.array(z.object({ context: z.unknown() })).length(1);
const idRow = z.array(z.object({ id: z.string().uuid() })).length(1);
const numberRow = z.array(z.object({ number: z.string().regex(/^[1-9]\d*$/) })).length(1);

export async function listFamilyInvoices(familyId: unknown) {
  const family = invoiceIdSchema.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(issuedInvoiceRowSchema).parse(await sql`SELECT id, snapshot, paid_pence::integer FROM portal.read_family_invoices(${userId}, ${family})`);
}
export async function readFamilyInvoice(familyId: unknown, invoiceId: unknown) {
  const family = invoiceIdSchema.parse(familyId);
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT id, snapshot, paid_pence::integer FROM portal.read_family_invoices(${userId}, ${family}) WHERE id=${invoice}`;
  return z.array(issuedInvoiceRowSchema).max(1).parse(rows)[0] ?? null;
}
export async function readAdminInvoice(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT id, family_id, recipient_name, recipient_address, invoice_number::text, snapshot, lines, paid_pence::integer FROM portal.read_admin_invoice(${userId}, ${invoice})`;
  return z.array(adminInvoiceRowSchema).max(1).parse(rows)[0] ?? null;
}
export async function previewInvoice(input: unknown) {
  const draft = draftInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const dates = JSON.stringify(draft.lines.map((line) => line.serviceDate));
  const rows = await sql`SELECT portal.invoice_draft_context(${userId}, ${draft.familyId}, ${dates}::jsonb) AS context`;
  const context = pricingContextSchema.parse(oneJson.parse(rows)[0].context);
  const lines = quoteDraftLines(draft.lines, context);
  return { lines, ...calculateInvoiceTotals(lines, context.settings) };
}
export async function createInvoiceDraft(input: unknown) {
  const draft = draftInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const request = JSON.stringify(draft);
  const replay = await sql`SELECT portal.read_invoice_draft_operation(${userId}, ${draft.operationId}, ${request}::jsonb) AS id`;
  const existing = z.array(z.object({ id: z.string().uuid().nullable() })).length(1).parse(replay)[0].id;
  if (existing) return existing;
  const dates = JSON.stringify(draft.lines.map((line) => line.serviceDate));
  const rows = await sql`SELECT portal.invoice_draft_context(${userId}, ${draft.familyId}, ${dates}::jsonb) AS context`;
  const context = pricingContextSchema.parse(oneJson.parse(rows)[0].context);
  const lines = quoteDraftLines(draft.lines, context);
  calculateInvoiceTotals(lines, context.settings);
  try {
    const result = await sql`SELECT portal.create_invoice_draft_checked(${userId}, ${draft.operationId}, ${request}::jsonb, ${JSON.stringify(context)}::jsonb, ${JSON.stringify(lines)}::jsonb) AS id`;
    return idRow.parse(result)[0].id;
  } catch (error) { throw translateInvoiceError(error); }
}
export async function issueInvoice(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.invoice_issue_context(${userId}, ${invoice}) AS context`;
  const context = issueContextSchema.parse(oneJson.parse(rows)[0].context);
  if (context.invoice_number !== null) return context.invoice_number;
  validateIssuanceSettings(context.lines, context.pricing.settings);
  verifyInvoiceLines(context.lines, context.pricing);
  calculateInvoiceTotals(context.lines, context.pricing.settings);
  try {
    const result = await sql`SELECT portal.issue_invoice_checked(${userId}, ${invoice}, ${JSON.stringify(context)}::jsonb)::text AS number`;
    return numberRow.parse(result)[0].number;
  } catch (error) { throw translateInvoiceError(error); }
}
export async function recordInvoicePayment(input: unknown): Promise<void> {
  const payment = paymentInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.record_invoice_payment(${userId}, ${payment.invoiceId}, ${payment.operationId}, ${payment.amountPence}, ${payment.paidOn}::date, ${payment.reference})`;
}
