import { z } from "zod";

const id = z.string().uuid();
const money = z.number().int().min(0).max(2147483647);
const cadence = z.enum(["weekly", "monthly"]);
const days = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const description = z.string().trim().min(1).max(500);

export const draftLineSchema = z.strictObject({
  description, quantity: z.number().int().min(1).max(1000000), days, cadence, serviceDate: z.iso.date(),
});
export const draftInputSchema = z.strictObject({
  operationId: id, familyId: id, recipientName: z.string().trim().min(1).max(200),
  recipientAddress: z.string().trim().min(1).max(1000), lines: z.array(draftLineSchema).min(1).max(100),
});
export const paymentInputSchema = z.strictObject({
  invoiceId: id, operationId: id, amountPence: money.min(1), paidOn: z.iso.date(),
  reference: z.string().trim().min(1).max(500),
});
export const invoiceIdSchema = id;
export type DraftInput = z.infer<typeof draftInputSchema>;
export type DraftLine = z.infer<typeof draftLineSchema>;

const pricedLineSchema = z.object({
  description: z.string().min(1).max(500), quantity: z.number().int().min(1).max(1000000), unit_amount_pence: money,
  service_date: z.iso.date(), rate_tier: z.enum(["standard", "founding", "founding-post-intro"]),
  hourly_rate_pence: money, days, cadence, session_minutes: z.number().int().positive(), discount_percent: z.number().int().min(0).max(100),
});
const invoiceSnapshotSchema = z.object({
  number: z.number().int().positive().safe(), issuer_name: z.string().min(1), issuer_address: z.string().min(1),
  recipient_name: z.string().min(1), recipient_address: z.string().min(1), issue_date: z.iso.date(), due_date: z.iso.date(),
  payment_terms_days: z.number().int().nonnegative(), payment_method: z.string().min(1), billing_cadence: cadence,
  founding_transition_date: z.iso.date().nullable(), vat_enabled: z.boolean(), vat_rate_basis_points: z.number().int().nullable(),
  vat_registration: z.string().nullable(), currency: z.literal("GBP"),
  lines: z.array(pricedLineSchema.extend({ net_pence: money, vat_pence: money })).min(1),
  net_pence: money, vat_pence: money, total_pence: money,
});
export const issuedInvoiceRowSchema = z.object({ id, snapshot: invoiceSnapshotSchema, paid_pence: money });
export const adminInvoiceRowSchema = z.object({
  id, family_id: id, recipient_name: z.string().min(1), recipient_address: z.string().min(1),
  invoice_number: z.string().regex(/^[1-9]\d*$/).nullable(), snapshot: invoiceSnapshotSchema.nullable(),
  lines: z.array(pricedLineSchema).nullable(), paid_pence: money,
});
export const pricingContextSchema = z.looseObject({
  family_id: id,
  settings: z.looseObject({ founding_transition_date: z.iso.date().nullable(), vat_enabled: z.boolean(), vat_rate_basis_points: z.number().int().min(0).max(10000).nullable(), vat_registration: z.string().nullable(), payment_terms_days: z.number().int().min(0).max(3650).nullable(), payment_method: z.string().nullable(), billing_cadence: cadence.nullable() }),
  slot_assigned: z.boolean(), history: z.array(z.looseObject({ id: z.string().regex(/^[1-9]\d*$/), is_founding: z.boolean(), changed_at: z.iso.datetime({ offset: true }) })),
  eligibility: z.array(z.object({ service_date: z.iso.date(), is_founding: z.boolean().nullable() })).min(1).max(100),
});
export const issueContextSchema = z.looseObject({
  invoice_id: id, invoice_number: z.string().regex(/^[1-9]\d*$/).nullable(), recipient_name: z.string().min(1), recipient_address: z.string().min(1),
  pricing: pricingContextSchema, lines: z.array(pricedLineSchema.loose()).min(1).max(100),
});
