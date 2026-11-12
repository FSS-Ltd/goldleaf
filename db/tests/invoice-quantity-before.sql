\set ON_ERROR_STOP on
INSERT INTO portal.memberships(subject, role) VALUES ('quantity-admin', 'admin');
INSERT INTO portal.families(id, display_name) VALUES ('d1000000-0000-4000-8000-000000000001', 'Quantity test');
SELECT portal.save_billing_settings('quantity-admin','Goldleaf','Address',false,NULL,NULL,14,'Bank','weekly','2027-04-05');
CREATE TABLE public.invoice_quantity_upgrade AS
WITH request AS (
 SELECT '{"operationId":"d1000000-0000-4000-8000-000000000002","familyId":"d1000000-0000-4000-8000-000000000001","recipientName":"Parent","recipientAddress":"Address","lines":[{"description":"Tuition","quantity":2,"days":1,"cadence":"weekly","serviceDate":"2027-04-05"}]}'::jsonb AS req,
 '[{"description":"Tuition","quantity":2,"unit_amount_pence":6000,"service_date":"2027-04-05","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]'::jsonb AS lines
), draft AS (
 SELECT req, lines, portal.create_invoice_draft_checked('quantity-admin','d1000000-0000-4000-8000-000000000002',req,portal.invoice_draft_context('quantity-admin','d1000000-0000-4000-8000-000000000001','["2027-04-05"]'),lines) AS id FROM request
)
SELECT req, lines, id, portal.invoice_issue_context('quantity-admin',id) AS issue_context FROM draft;
CREATE TABLE public.invoice_quantity_snapshot AS
SELECT portal.create_invoice_draft('quantity-admin','d1000000-0000-4000-8000-000000000001','Parent','Address',lines) AS id FROM public.invoice_quantity_upgrade;
SELECT portal.issue_invoice('quantity-admin',id) FROM public.invoice_quantity_snapshot;
ALTER TABLE public.invoice_quantity_snapshot ADD COLUMN snapshot jsonb;
UPDATE public.invoice_quantity_snapshot t SET snapshot=i.snapshot FROM portal.invoices i WHERE i.id=t.id;
