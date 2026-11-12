\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject, role) VALUES ('billing-admin', 'admin'), ('billing-staff', 'staff');
INSERT INTO portal.families(id, display_name) VALUES ('80000000-0000-0000-0000-000000000001', 'Billing'), ('80000000-0000-0000-0000-000000000002', 'Legacy');
INSERT INTO portal.memberships(subject, role, family_id) VALUES ('billing-parent', 'parent', '80000000-0000-0000-0000-000000000001'), ('billing-other-parent', 'parent', '80000000-0000-0000-0000-000000000002');
DO $$ DECLARE c jsonb; BEGIN
 c := portal.invoice_draft_context('billing-admin', '80000000-0000-0000-0000-000000000001', '["2027-03-28"]');
 IF (c->'eligibility'->0->>'is_founding')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'new family should be standard'; END IF;
 BEGIN PERFORM portal.invoice_draft_context('billing-staff', '80000000-0000-0000-0000-000000000001', '["2027-03-28"]'); RAISE EXCEPTION 'staff read billing context'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE portal.founding_slots SET family_id='80000000-0000-0000-0000-000000000002' WHERE slot=1;
DO $$ DECLARE c jsonb; BEGIN
 c := portal.invoice_draft_context('billing-admin', '80000000-0000-0000-0000-000000000002', '["2027-03-28"]');
 IF c->'eligibility'->0->'is_founding' <> 'null'::jsonb THEN RAISE EXCEPTION 'legacy eligibility guessed'; END IF;
END $$;
INSERT INTO portal.founding_history(family_id, slot, is_founding, changed_at, changed_by)
SELECT '80000000-0000-0000-0000-000000000001', 2, true, '2027-03-28 22:59:59+00', id FROM portal.memberships WHERE subject='billing-admin';
INSERT INTO portal.founding_history(family_id, slot, is_founding, changed_at, changed_by)
SELECT '80000000-0000-0000-0000-000000000001', 2, false, '2027-03-28 23:00:00+00', id FROM portal.memberships WHERE subject='billing-admin';
DO $$ DECLARE c jsonb; BEGIN
 c := portal.invoice_draft_context('billing-admin', '80000000-0000-0000-0000-000000000001', '["2027-03-27","2027-03-28","2027-03-29"]');
 IF c->'eligibility' <> '[{"service_date":"2027-03-27","is_founding":false},{"service_date":"2027-03-28","is_founding":true},{"service_date":"2027-03-29","is_founding":false}]'::jsonb THEN RAISE EXCEPTION 'London DST cutoff wrong: %', c->'eligibility'; END IF;
END $$;
INSERT INTO portal.founding_history(family_id, slot, is_founding, changed_at, changed_by)
SELECT '80000000-0000-0000-0000-000000000001', 2, true, '2027-10-31 22:00:00+00', id FROM portal.memberships WHERE subject='billing-admin';
INSERT INTO portal.founding_history(family_id, slot, is_founding, changed_at, changed_by)
SELECT '80000000-0000-0000-0000-000000000001', 2, false, '2027-10-31 23:59:59+00', id FROM portal.memberships WHERE subject='billing-admin';
DO $$ DECLARE c jsonb; BEGIN
 c := portal.invoice_draft_context('billing-admin', '80000000-0000-0000-0000-000000000001', '["2027-10-31"]');
 IF (c->'eligibility'->0->>'is_founding')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'same-day final change not applied'; END IF;
END $$;
SELECT portal.save_billing_settings('billing-admin','Goldleaf Learning Ltd','51 Hurst rd',false,NULL,NULL,14,'Bank','weekly','2027-04-01');
DO $$
DECLARE f uuid := '80000000-0000-0000-0000-000000000001'; op uuid := '80000000-0000-0000-0000-000000000010'; inv uuid; ctx jsonb; current_ctx jsonb; issued_snapshot jsonb; result bigint;
 req jsonb := '{"operationId":"80000000-0000-0000-0000-000000000010","familyId":"80000000-0000-0000-0000-000000000001","recipientName":"Parent","recipientAddress":"Address","lines":[{"description":"Tuition","quantity":1,"days":1,"cadence":"weekly","serviceDate":"2027-03-27"}]}';
 lines jsonb := '[{"description":"Tuition","quantity":1,"unit_amount_pence":6000,"service_date":"2027-03-27","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]';
BEGIN
 ctx := portal.invoice_draft_context('billing-admin',f,'["2027-03-27"]');
 UPDATE portal.billing_settings SET payment_terms_days=15;
 BEGIN PERFORM portal.create_invoice_draft_checked('billing-admin',op,req,ctx,lines); RAISE EXCEPTION 'stale draft accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 ctx := portal.invoice_draft_context('billing-admin',f,'["2027-03-27"]');
 inv := portal.create_invoice_draft_checked('billing-admin',op,req,ctx,lines);
 IF portal.create_invoice_draft_checked('billing-admin',op,req,ctx,lines) <> inv OR portal.read_invoice_draft_operation('billing-admin',op,req) <> inv THEN RAISE EXCEPTION 'draft replay failed'; END IF;
 BEGIN PERFORM portal.read_invoice_draft_operation('billing-admin',op,req || '{"recipientName":"Other"}'); RAISE EXCEPTION 'draft conflict accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 ctx := portal.invoice_issue_context('billing-admin',inv);
 UPDATE portal.invoices SET recipient_name='Changed' WHERE id=inv;
 BEGIN PERFORM portal.issue_invoice_checked('billing-admin',inv,ctx); RAISE EXCEPTION 'stale recipient issued'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 UPDATE portal.invoices SET recipient_name='Parent' WHERE id=inv;
 ctx := portal.invoice_issue_context('billing-admin',inv);
 UPDATE portal.billing_settings SET payment_terms_days=16;
 BEGIN PERFORM portal.issue_invoice_checked('billing-admin',inv,ctx); RAISE EXCEPTION 'stale settings issued'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 ctx := portal.invoice_issue_context('billing-admin',inv);
 UPDATE portal.invoice_lines SET unit_amount_pence=6100 WHERE invoice_id=inv;
 BEGIN PERFORM portal.issue_invoice_checked('billing-admin',inv,ctx); RAISE EXCEPTION 'stale lines issued'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 UPDATE portal.invoice_lines SET unit_amount_pence=6000 WHERE invoice_id=inv;
 ctx := portal.invoice_issue_context('billing-admin',inv);
 INSERT INTO portal.founding_history(family_id, slot, is_founding, changed_by) SELECT f, 2, true, id FROM portal.memberships WHERE subject='billing-admin';
 BEGIN PERFORM portal.issue_invoice_checked('billing-admin',inv,ctx); RAISE EXCEPTION 'stale eligibility issued'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 current_ctx := portal.invoice_issue_context('billing-admin',inv);
 result := portal.issue_invoice_checked('billing-admin',inv,current_ctx);
 IF portal.issue_invoice_checked('billing-admin',inv,ctx) <> result THEN RAISE EXCEPTION 'issue replay failed'; END IF;
 SELECT snapshot INTO issued_snapshot FROM portal.invoices WHERE id=inv;
 PERFORM portal.set_founding('billing-admin',f,true);
 IF issued_snapshot IS DISTINCT FROM (SELECT snapshot FROM portal.invoices WHERE id=inv) THEN RAISE EXCEPTION 'tag change rewrote snapshot'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.read_family_invoices('billing-parent',f) WHERE id=inv) OR EXISTS (SELECT 1 FROM portal.read_family_invoices('billing-other-parent',f)) OR EXISTS (SELECT 1 FROM portal.read_family_invoices('billing-staff',f)) THEN RAISE EXCEPTION 'family isolation failed'; END IF;
 UPDATE portal.memberships SET revoked_at=now() WHERE subject='billing-parent';
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('billing-parent',f)) THEN RAISE EXCEPTION 'revoked parent read'; END IF;
END $$;
DO $$ BEGIN
 IF has_function_privilege('public','portal.invoice_pricing_context(uuid,jsonb)','EXECUTE') OR has_function_privilege('public','portal.issue_invoice_checked(text,uuid,jsonb)','EXECUTE') OR has_table_privilege('public','portal.invoice_draft_operations','SELECT') THEN RAISE EXCEPTION 'public access'; END IF;
END $$;
CREATE ROLE goldleaf_invoice_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO goldleaf_invoice_test;
GRANT EXECUTE ON FUNCTION portal.invoice_draft_context(text,uuid,jsonb), portal.invoice_issue_context(text,uuid), portal.read_invoice_draft_operation(text,uuid,jsonb), portal.create_invoice_draft_checked(text,uuid,jsonb,jsonb,jsonb), portal.issue_invoice_checked(text,uuid,jsonb), portal.read_billing_settings(text), portal.save_billing_settings(text,text,text,boolean,integer,text,integer,text,text,date), portal.read_admin_invoice(text,uuid), portal.read_family_invoices(text,uuid), portal.record_invoice_payment(text,uuid,uuid,integer,date,text) TO goldleaf_invoice_test;
SET LOCAL ROLE goldleaf_invoice_test;
DO $$ BEGIN
 BEGIN PERFORM portal.invoice_pricing_context('80000000-0000-0000-0000-000000000001','["2027-01-01"]'); RAISE EXCEPTION 'internal helper granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.issue_invoice('billing-admin',gen_random_uuid()); RAISE EXCEPTION 'raw issue granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.create_invoice_draft('billing-admin',gen_random_uuid(),'Name','Address','[]'); RAISE EXCEPTION 'raw create granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM portal.invoice_lines; RAISE EXCEPTION 'table access granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT EXISTS (SELECT 1 FROM portal.read_billing_settings('billing-admin') WHERE issuer_name='Goldleaf Learning Ltd') THEN RAISE EXCEPTION 'admin settings unavailable'; END IF;
 IF portal.invoice_draft_context('billing-admin','80000000-0000-0000-0000-000000000001','["2027-01-01"]') IS NULL THEN RAISE EXCEPTION 'admin pricing context unavailable'; END IF;
 BEGIN PERFORM portal.read_billing_settings('billing-parent'); RAISE EXCEPTION 'parent read settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM portal.read_family_invoices('billing-parent','80000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'revoked parent retained access'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
