import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import type { IssuedInvoice } from "./invoice-schemas";
import { adminInvoiceListRowSchema, adminInvoiceRowSchema, draftInputSchema, invoiceIdSchema, issueContextSchema, issuedInvoiceRowSchema, paymentInputSchema, parentInvoiceListRowSchema, pricingContextSchema } from "./invoice-schemas";
import { translateInvoiceError } from "./invoice-errors";
import { assertInvoiceFingerprint, invoiceFingerprint } from "./invoice-fingerprint";
import { billingSettingsRowSchema } from "./billing-settings-schema";
import { calculateInvoiceTotals, quoteDraftLines, validateIssuanceSettings, verifyInvoiceLines } from "./invoice-quote";

const oneJson = z.array(z.object({ context: z.unknown() })).length(1);
const idRow = z.array(z.object({ id: z.string().uuid() })).length(1);
const numberRow = z.array(z.object({ number: z.string().regex(/^[1-9]\d*$/) })).length(1);

export async function listParentInvoices() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(parentInvoiceListRowSchema).parse(await sql`SELECT * FROM portal.list_parent_invoices(${userId})`);
}
export async function listFamilyInvoices(familyId: unknown) {
  const family = invoiceIdSchema.parse(familyId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(issuedInvoiceRowSchema).parse(await sql`SELECT id, snapshot, paid_pence::integer FROM portal.read_family_invoices(${userId}, ${family})`);
}
export async function readFamilyInvoice(familyId: unknown, invoiceId: unknown): Promise<IssuedInvoice | null> {
  const family = invoiceIdSchema.parse(familyId);
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT id, snapshot, paid_pence::integer FROM portal.read_family_invoices(${userId}, ${family}) WHERE id=${invoice}`;
  return z.array(issuedInvoiceRowSchema).max(1).parse(rows)[0] ?? null;
}
export async function listAdminInvoices() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(adminInvoiceListRowSchema).parse(await sql`SELECT * FROM portal.list_admin_invoices(${userId})`);
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
  const lines = quoteDraftLines(draft.lines, context, draft.quantityIntent === "children-v1" ? "children" : "periods");
  return { lines, ...calculateInvoiceTotals(lines, context.settings), settings: billingSettingsRowSchema.parse(context.settings), fingerprint: invoiceFingerprint({ draft, context, lines }) };
}
export async function createInvoiceDraft(input: unknown, reviewed: unknown) {
  const draft = draftInputSchema.parse(input);
  const expected = z.string().regex(/^[0-9a-f]{64}$/).parse(reviewed);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const request = JSON.stringify(draft);
  const replay = await sql`SELECT portal.read_invoice_draft_operation(${userId}, ${draft.operationId}, ${request}::jsonb) AS id`;
  const existing = z.array(z.object({ id: z.string().uuid().nullable() })).length(1).parse(replay)[0].id;
  if (existing) return existing;
  const dates = JSON.stringify(draft.lines.map((line) => line.serviceDate));
  const rows = await sql`SELECT portal.invoice_draft_context(${userId}, ${draft.familyId}, ${dates}::jsonb) AS context`;
  const context = pricingContextSchema.parse(oneJson.parse(rows)[0].context);
  const lines = quoteDraftLines(draft.lines, context, draft.quantityIntent === "children-v1" ? "children" : "periods");
  calculateInvoiceTotals(lines, context.settings);
  assertInvoiceFingerprint(expected, { draft, context, lines });
  try {
    const result = await sql`SELECT portal.create_invoice_session_draft_checked(${userId}, ${draft.operationId}, ${request}::jsonb, ${JSON.stringify(context)}::jsonb, ${JSON.stringify(lines)}::jsonb) AS id`;
    return idRow.parse(result)[0].id;
  } catch (error) { throw translateInvoiceError(error); }
}
export async function previewSavedInvoice(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.invoice_issue_context(${userId}, ${invoice}) AS context`;
  const context = issueContextSchema.parse(oneJson.parse(rows)[0].context);
  if (context.invoice_number !== null) throw new Error("Invoice is already issued");
  validateIssuanceSettings(context.lines, context.pricing.settings);
  verifyInvoiceLines(context.lines, context.pricing);
  return { lines: context.lines, ...calculateInvoiceTotals(context.lines, context.pricing.settings),
    settings: billingSettingsRowSchema.parse(context.pricing.settings), recipientName: context.recipient_name,
    recipientAddress: context.recipient_address, fingerprint: invoiceFingerprint({ context }) };
}
export async function issueInvoice(invoiceId: unknown, reviewed: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const expected = z.string().regex(/^[0-9a-f]{64}$/).parse(reviewed);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.invoice_issue_context(${userId}, ${invoice}) AS context`;
  const context = issueContextSchema.parse(oneJson.parse(rows)[0].context);
  if (context.invoice_number !== null) return context.invoice_number;
  validateIssuanceSettings(context.lines, context.pricing.settings);
  verifyInvoiceLines(context.lines, context.pricing);
  calculateInvoiceTotals(context.lines, context.pricing.settings);
  assertInvoiceFingerprint(expected, { context });
  try {
    const result = await sql`SELECT portal.issue_invoice_checked(${userId}, ${invoice}, ${JSON.stringify(context)}::jsonb)::text AS number`;
    return numberRow.parse(result)[0].number;
  } catch (error) { throw translateInvoiceError(error); }
}
const paymentIntentStatus = z.enum(["pending", "recorded", "rejected"]);
export async function prepareInvoicePayment(input: unknown) {
  const payment = paymentInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT portal.prepare_invoice_payment(${userId}, ${payment.invoiceId}, ${payment.operationId}, ${payment.amountPence}, ${payment.paidOn}::date, ${payment.reference}) AS status`;
  return z.array(z.object({ status: paymentIntentStatus })).length(1).parse(rows)[0].status;
}
export async function completeInvoicePayment(invoiceId: unknown, operationId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId); const operation = invoiceIdSchema.parse(operationId);
  const { userId } = await requirePortalIdentity(); const sql = portalDatabase();
  const rows = await sql`SELECT portal.complete_invoice_payment(${userId}, ${invoice}, ${operation}) AS status`;
  return z.array(z.object({ status: paymentIntentStatus })).length(1).parse(rows)[0].status;
}
export async function listInvoicePaymentIntents(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId); const { userId } = await requirePortalIdentity(); const sql = portalDatabase();
  const rows = await sql`SELECT * FROM portal.list_invoice_payment_intents(${userId}, ${invoice})`;
  return z.array(z.object({ operation_id: z.string().uuid(), amount_pence: z.number().int().positive(), paid_on: z.iso.date(), reference: z.string().min(1), status: paymentIntentStatus })).parse(rows);
}
export async function readPaymentOperation(invoiceId: unknown, operationId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const operation = invoiceIdSchema.parse(operationId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT * FROM portal.read_invoice_payment_operation(${userId}, ${invoice}, ${operation})`;
  return z.array(z.object({ amount_pence: z.number().int().positive(), paid_on: z.iso.date(), reference: z.string().min(1) })).max(1).parse(rows)[0] ?? null;
}

export async function listInvoicePayments(invoiceId: unknown) {
  const invoice = invoiceIdSchema.parse(invoiceId);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  return z.array(z.object({ amount_pence: z.number().int().positive(), paid_on: z.iso.date(), reference: z.string().min(1) })).parse(await sql`SELECT * FROM portal.list_invoice_payments(${userId}, ${invoice})`);
}
