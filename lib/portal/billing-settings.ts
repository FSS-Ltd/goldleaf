import "server-only";
import { z } from "zod";
import { requirePortalIdentity } from "./access";
import { portalDatabase } from "./database";
import { billingSettingsInputSchema, billingSettingsRowSchema } from "./billing-settings-schema";

export async function readBillingSettings() {
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  const rows = await sql`SELECT singleton, issuer_name, issuer_address, issuer_contact, vat_enabled, vat_rate_basis_points,
    vat_registration, payment_terms_days, payment_method, billing_cadence,
    to_char(founding_transition_date, 'YYYY-MM-DD') AS founding_transition_date
    FROM portal.read_billing_settings(${userId})`;
  return z.array(billingSettingsRowSchema).length(1).parse(rows)[0];
}

export async function saveBillingSettings(input: unknown): Promise<void> {
  const data = billingSettingsInputSchema.parse(input);
  const { userId } = await requirePortalIdentity();
  const sql = portalDatabase();
  await sql`SELECT portal.save_billing_settings_with_contact(${userId}, ${data.issuerName}, ${data.issuerAddress}, ${data.issuerContact}, ${data.vatEnabled}, ${data.vatRateBasisPoints}, ${data.vatRegistration}, ${data.paymentTermsDays}, ${data.paymentMethod}, ${data.billingCadence}, ${data.foundingTransitionDate}::date)`;
}
