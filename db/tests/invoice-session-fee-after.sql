\set ON_ERROR_STOP on
BEGIN;
DO $$ DECLARE req jsonb := '{"operationId":"22000000-0000-4000-8000-000000000010","quantityIntent":"children-v1","familyId":"22000000-0000-4000-8000-000000000001","recipientName":"Parent","recipientAddress":"Address","lines":[{"description":"Tuition","quantity":2,"days":4,"cadence":"weekly","serviceDate":"2027-04-05"}]}'::jsonb;
 lines jsonb := '[{"description":"Tuition","quantity":2,"quantity_basis":"children","unit_amount_pence":23000,"service_date":"2027-04-05","rate_tier":"standard","pricing_basis":"session","hourly_rate_pence":null,"session_fee_pence":6000,"days":4,"cadence":"weekly","session_minutes":105,"discount_percent":5}]'::jsonb;
 ctx jsonb; inv uuid; issue_ctx jsonb; snap jsonb; legacy record; BEGIN
 SELECT * INTO legacy FROM public.invoice_session_fee_legacy;
 IF (SELECT snapshot FROM portal.invoices WHERE id=legacy.issued_id) IS DISTINCT FROM legacy.old_snapshot THEN RAISE EXCEPTION 'legacy snapshot changed'; END IF;
 IF (SELECT hourly_rate_pence FROM portal.invoice_lines WHERE invoice_id=legacy.draft_id) <> 3000 THEN RAISE EXCEPTION 'legacy draft changed'; END IF;
 ctx := portal.invoice_draft_context('session-fee-admin','22000000-0000-4000-8000-000000000001','["2027-04-05"]');
 inv := portal.create_invoice_session_draft_checked('session-fee-admin','22000000-0000-4000-8000-000000000010',req,ctx,lines);
 IF portal.create_invoice_session_draft_checked('session-fee-admin','22000000-0000-4000-8000-000000000010',req,ctx,lines) <> inv THEN RAISE EXCEPTION 'replay changed'; END IF;
 issue_ctx := portal.invoice_issue_context('session-fee-admin',inv);
 IF issue_ctx->'lines'->0->>'pricing_basis' <> 'session' OR (issue_ctx->'lines'->0->>'session_fee_pence')::int <> 6000 OR issue_ctx->'lines'->0->>'hourly_rate_pence' IS NOT NULL THEN RAISE EXCEPTION 'wrong session metadata'; END IF;
 PERFORM portal.issue_invoice_checked('session-fee-admin',inv,issue_ctx);
 SELECT snapshot INTO snap FROM portal.invoices WHERE id=inv;
 IF snap->'lines'->0->>'pricing_basis' <> 'session' OR (snap->'lines'->0->>'session_fee_pence')::int <> 6000 OR (snap->>'total_pence')::int <> 46000 THEN RAISE EXCEPTION 'wrong session snapshot'; END IF;
 IF (SELECT snapshot FROM portal.invoices WHERE id=legacy.issued_id) IS DISTINCT FROM legacy.old_snapshot THEN RAISE EXCEPTION 'legacy snapshot changed after issue'; END IF;
 BEGIN PERFORM portal.create_invoice_session_draft_checked('session-fee-admin',gen_random_uuid(),req,ctx,jsonb_set(lines,'{0,hourly_rate_pence}','3000')); RAISE EXCEPTION 'hourly accepted as session'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF has_function_privilege('public','portal.create_invoice_session_draft_checked(text,uuid,jsonb,jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'public access'; END IF;
END $$;
ROLLBACK;
