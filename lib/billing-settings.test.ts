import assert from "node:assert/strict";
import { test } from "node:test";
import { billingSettingsInputSchema, billingSettingsRowSchema } from "./portal/billing-settings-schema";

const settings = {
  issuerName: "Goldleaf Learning Ltd", issuerAddress: "51 Hurst rd", vatEnabled: false,
  vatRateBasisPoints: null, vatRegistration: null, paymentTermsDays: null, paymentMethod: null,
  billingCadence: null, foundingTransitionDate: null,
};

test("billing settings require explicit valid configuration without guessed defaults", () => {
  assert.deepEqual(billingSettingsInputSchema.parse(settings), settings);
  assert.equal(billingSettingsInputSchema.safeParse({ ...settings, vatEnabled: true }).success, false);
  assert.equal(billingSettingsInputSchema.safeParse({ ...settings, vatEnabled: true, vatRateBasisPoints: 2000, vatRegistration: "GB123" }).success, true);
  for (const invalid of [
    { ...settings, issuerName: " " }, { ...settings, paymentTermsDays: -1 },
    { ...settings, vatRateBasisPoints: 20000 }, { ...settings, paymentTermsDays: 1.5 },
    { ...settings, foundingTransitionDate: "2027-02-30" }, { ...settings, billingCadence: "annual" },
    { ...settings, paymentMethod: " " }, { ...settings, subject: "spoofed" },
  ]) assert.equal(billingSettingsInputSchema.safeParse(invalid).success, false);
});

test("billing settings database rows are checked", () => {
  assert.equal(billingSettingsRowSchema.safeParse({ singleton: true, issuer_name: settings.issuerName, issuer_address: settings.issuerAddress,
    vat_enabled: false, vat_rate_basis_points: null, vat_registration: null, payment_terms_days: null,
    payment_method: null, billing_cadence: null, founding_transition_date: null }).success, true);
  assert.equal(billingSettingsRowSchema.safeParse({ issuer_name: "" }).success, false);
});
