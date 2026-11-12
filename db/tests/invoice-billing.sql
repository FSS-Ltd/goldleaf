\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject, role) VALUES ('invoice-admin', 'admin'), ('invoice-staff', 'staff');
SELECT portal.create_family('invoice-admin', 'Invoice family') AS family \gset
INSERT INTO portal.memberships(subject, role, family_id) VALUES ('invoice-parent', 'parent', :'family');
SELECT portal.create_family('invoice-admin', 'Other invoice family') AS other_family \gset
INSERT INTO portal.memberships(subject, role, family_id) VALUES ('other-invoice-parent', 'parent', :'other_family');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.billing_settings WHERE issuer_name = 'Goldleaf Learning Ltd' AND issuer_address = '51 Hurst rd' AND NOT vat_enabled AND payment_terms_days IS NULL AND payment_method IS NULL AND billing_cadence IS NULL AND founding_transition_date IS NULL) THEN RAISE EXCEPTION 'seed settings mismatch'; END IF;
END $$;
DO $$ BEGIN
 IF has_table_privilege('public','portal.invoices','SELECT') OR has_function_privilege('public','portal.issue_invoice(text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'public billing access'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('invoice-parent', gen_random_uuid())) THEN RAISE EXCEPTION 'foreign family read'; END IF;
 BEGIN PERFORM portal.read_billing_settings('invoice-parent'); RAISE EXCEPTION 'parent read settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.save_billing_settings('invoice-admin', 'Goldleaf Learning Ltd', '51 Hurst rd', false, NULL, NULL, 14, 'Bank transfer', 'weekly', '2027-04-01');
SELECT portal.create_invoice_draft('invoice-admin', :'family', 'Parent Name', 'Parent Address', '[{"description":"Tuition","quantity":1,"unit_amount_pence":22500,"service_date":"2027-04-01","rate_tier":"founding-post-intro","hourly_rate_pence":2800,"days":4,"cadence":"weekly","session_minutes":120,"discount_percent":0}]'::jsonb) AS invoice \gset
DO $$ DECLARE f uuid := (SELECT id FROM portal.families WHERE display_name='Invoice family'); i uuid;
BEGIN
 i := portal.create_invoice_draft('invoice-admin', f, 'Name', 'Address', '[{"description":"Test","quantity":1,"unit_amount_pence":1,"service_date":"2027-01-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]');
 UPDATE portal.billing_settings SET payment_terms_days=NULL;
 BEGIN PERFORM portal.issue_invoice('invoice-admin',i); RAISE EXCEPTION 'incomplete policy issued'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 UPDATE portal.billing_settings SET payment_terms_days=14;
END $$;
SELECT portal.issue_invoice('invoice-admin', :'invoice') AS number \gset
SELECT portal.issue_invoice('invoice-admin', :'invoice') AS replay \gset
SELECT portal.record_invoice_payment('invoice-admin', :'invoice', '00000000-0000-0000-0000-000000000001', 22500, '2027-04-02', 'bank-ref');
SELECT portal.record_invoice_payment('invoice-admin', :'invoice', '00000000-0000-0000-0000-000000000001', 22500, '2027-04-02', 'bank-ref');
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.invoice_payments) <> 1 THEN RAISE EXCEPTION 'payment replay duplicated'; END IF;
 IF (SELECT count(*) FROM portal.read_family_invoices('invoice-parent', (SELECT id FROM portal.families WHERE display_name='Invoice family'))) <> 1 THEN RAISE EXCEPTION 'parent cannot read'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('invoice-staff', (SELECT id FROM portal.families WHERE display_name='Invoice family'))) THEN RAISE EXCEPTION 'staff read invoice'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('other-invoice-parent', (SELECT id FROM portal.families WHERE display_name='Invoice family'))) THEN RAISE EXCEPTION 'other family read invoice'; END IF;
END $$;
DO $$
DECLARE f uuid := (SELECT id FROM portal.families WHERE display_name='Invoice family'); i uuid; before_snapshot jsonb; after_snapshot jsonb;
BEGIN
 SELECT id, snapshot INTO i, before_snapshot FROM portal.invoices WHERE family_id=f AND issued_at IS NOT NULL;
 IF (before_snapshot->>'total_pence')::integer <> 22500 OR before_snapshot->>'issuer_name' <> 'Goldleaf Learning Ltd' THEN RAISE EXCEPTION 'bad snapshot'; END IF;
 PERFORM portal.save_billing_settings('invoice-admin', 'Changed', 'Changed address', true, 2000, 'GB123', 30, 'Cash', 'monthly', '2027-05-01');
 SELECT snapshot INTO after_snapshot FROM portal.invoices WHERE id=i;
 IF before_snapshot <> after_snapshot THEN RAISE EXCEPTION 'issued snapshot changed'; END IF;
 BEGIN UPDATE portal.invoices SET snapshot = '{}' WHERE id=i; RAISE EXCEPTION 'issued invoice editable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 BEGIN UPDATE portal.invoice_lines SET unit_amount_pence=1 WHERE invoice_id=i; RAISE EXCEPTION 'issued line editable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 BEGIN DELETE FROM portal.invoice_payments WHERE invoice_id=i; RAISE EXCEPTION 'payment editable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
 BEGIN PERFORM portal.record_invoice_payment('invoice-admin', i, '00000000-0000-0000-0000-000000000001', 1, '2027-04-02', 'bank-ref'); RAISE EXCEPTION 'conflicting replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM portal.record_invoice_payment('invoice-admin', i, gen_random_uuid(), 1, '2027-04-02', 'extra'); RAISE EXCEPTION 'overpayment accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM portal.save_billing_settings('invoice-staff', 'X', 'X', false, NULL, NULL, NULL, NULL, NULL, NULL); RAISE EXCEPTION 'staff changed settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE portal.memberships SET revoked_at=now() WHERE subject='invoice-parent';
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('invoice-parent',f)) THEN RAISE EXCEPTION 'revoked parent read invoice'; END IF;
END $$;
DO $$
DECLARE f uuid := (SELECT id FROM portal.families WHERE display_name='Invoice family'); i uuid; snap jsonb;
BEGIN
 i := portal.create_invoice_draft('invoice-admin', f, 'Name', 'Address', '[{"description":"Test","quantity":1,"unit_amount_pence":3,"service_date":"2027-04-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"monthly","session_minutes":120,"discount_percent":0}]');
 PERFORM portal.issue_invoice('invoice-admin',i);
 SELECT snapshot INTO snap FROM portal.invoices WHERE id=i;
 IF (snap->>'vat_pence')::integer <> 1 OR (snap->>'total_pence')::integer <> 4 THEN RAISE EXCEPTION 'VAT rounding failed'; END IF;
 BEGIN PERFORM portal.create_invoice_draft('invoice-admin', f, 'Name', 'Address', '[{"description":"Test","quantity":2,"unit_amount_pence":2147483647,"service_date":"2027-04-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"monthly","session_minutes":120,"discount_percent":0}]'); RAISE EXCEPTION 'overflow accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM portal.create_invoice_draft('invoice-admin', f, 'Name', 'Address', '[{"description":"Test","quantity":1,"unit_amount_pence":-1,"service_date":"2027-04-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"monthly","session_minutes":120,"discount_percent":0}]'); RAISE EXCEPTION 'negative accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
