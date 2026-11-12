\set ON_ERROR_STOP on
DO $$
DECLARE old record; child uuid; ctx jsonb; child_req jsonb; child_lines jsonb; snap jsonb;
BEGIN
 SELECT * INTO old FROM public.invoice_quantity_upgrade;
 IF portal.read_invoice_draft_operation('quantity-admin','d1000000-0000-4000-8000-000000000002',old.req) <> old.id THEN RAISE EXCEPTION 'legacy replay changed'; END IF;
 IF portal.invoice_issue_context('quantity-admin',old.id) IS DISTINCT FROM old.issue_context THEN RAISE EXCEPTION 'legacy issue context changed'; END IF;
 IF EXISTS (SELECT 1 FROM public.invoice_quantity_snapshot t JOIN portal.invoices i ON i.id=t.id WHERE i.snapshot IS DISTINCT FROM t.snapshot OR i.snapshot->'lines'->0 ? 'quantity_basis') THEN RAISE EXCEPTION 'historical snapshot changed'; END IF;
 PERFORM portal.issue_invoice_checked('quantity-admin',old.id,old.issue_context);
 child_req := jsonb_set(jsonb_set(old.req,'{operationId}','"d1000000-0000-4000-8000-000000000003"'),'{quantityIntent}','"children-v1"');
 child_lines := jsonb_set(old.lines,'{0,quantity_basis}','"children"');
 ctx := portal.invoice_draft_context('quantity-admin','d1000000-0000-4000-8000-000000000001','["2027-04-05"]');
 BEGIN
   PERFORM portal.create_invoice_draft_checked('quantity-admin','d1000000-0000-4000-8000-000000000003',child_req,ctx,old.lines);
   RAISE EXCEPTION 'mismatched basis accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 child := portal.create_invoice_draft_checked('quantity-admin','d1000000-0000-4000-8000-000000000003',child_req,ctx,child_lines);
 IF portal.read_invoice_draft_operation('quantity-admin','d1000000-0000-4000-8000-000000000003',child_req) <> child THEN RAISE EXCEPTION 'child replay failed'; END IF;
 ctx := portal.invoice_issue_context('quantity-admin',child);
 IF ctx->'lines'->0->>'quantity_basis' <> 'children' THEN RAISE EXCEPTION 'child basis missing from issue context'; END IF;
 UPDATE portal.invoice_lines SET quantity_basis='periods' WHERE invoice_id=child;
 BEGIN PERFORM portal.issue_invoice_checked('quantity-admin',child,ctx); RAISE EXCEPTION 'basis change accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 UPDATE portal.invoice_lines SET quantity_basis='children' WHERE invoice_id=child;
 PERFORM portal.issue_invoice_checked('quantity-admin',child,ctx);
 SELECT snapshot INTO snap FROM portal.invoices WHERE id=child;
 IF snap->'lines'->0->>'quantity_basis' <> 'children' OR (snap->>'total_pence')::integer <> 12000 THEN RAISE EXCEPTION 'child snapshot incorrect'; END IF;
 IF has_function_privilege('public','portal.create_invoice_draft_checked(text,uuid,jsonb,jsonb,jsonb)','EXECUTE') OR has_table_privilege('public','portal.invoice_lines','SELECT') THEN RAISE EXCEPTION 'public access'; END IF;
END $$;
