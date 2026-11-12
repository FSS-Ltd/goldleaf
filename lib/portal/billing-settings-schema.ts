import { z } from "zod";

const name = z.string().trim().min(1).max(200);
const address = z.string().trim().min(1).max(1000);
const vatRate = z.number().int().min(0).max(10000).nullable();
const registration = z.string().trim().min(1).max(100).nullable();
const terms = z.number().int().min(0).max(3650).nullable();
const method = z.string().trim().min(1).max(1000).nullable();
const cadence = z.enum(["weekly", "monthly"]).nullable();
const transition = z.iso.date().nullable();

export const billingSettingsInputSchema = z.strictObject({
  issuerName: name, issuerAddress: address, vatEnabled: z.boolean(), vatRateBasisPoints: vatRate,
  vatRegistration: registration, paymentTermsDays: terms, paymentMethod: method,
  billingCadence: cadence, foundingTransitionDate: transition,
}).refine((value) => !value.vatEnabled || (value.vatRateBasisPoints !== null && value.vatRegistration !== null), {
  message: "VAT rate and registration are required when VAT is enabled",
});

export const billingSettingsRowSchema = z.object({
  singleton: z.literal(true), issuer_name: name, issuer_address: address, vat_enabled: z.boolean(),
  vat_rate_basis_points: vatRate, vat_registration: registration, payment_terms_days: terms,
  payment_method: method, billing_cadence: cadence, founding_transition_date: transition,
});
export type BillingSettingsInput = z.infer<typeof billingSettingsInputSchema>;
