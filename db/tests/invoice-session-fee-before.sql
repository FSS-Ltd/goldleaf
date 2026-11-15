\set ON_ERROR_STOP on
INSERT INTO portal.memberships(subject,role) VALUES ('session-fee-admin','admin');
INSERT INTO portal.families(id,display_name) VALUES ('22000000-0000-4000-8000-000000000001','Synthetic family');
SELECT portal.save_billing_settings('session-fee-admin','Goldleaf','Address',false,NULL,NULL,14,'Bank','weekly','2027-04-01');
CREATE TABLE public.invoice_session_fee_legacy AS
SELECT portal.create_invoice_draft('session-fee-admin','22000000-0000-4000-8000-000000000001','Parent','Address','[{"description":"Legacy","quantity":1,"unit_amount_pence":6000,"service_date":"2027-03-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]') AS issued_id,
       portal.create_invoice_draft('session-fee-admin','22000000-0000-4000-8000-000000000001','Parent','Address','[{"description":"Draft","quantity":1,"unit_amount_pence":6000,"service_date":"2027-03-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]') AS draft_id;
SELECT portal.issue_invoice('session-fee-admin',issued_id) FROM public.invoice_session_fee_legacy;
ALTER TABLE public.invoice_session_fee_legacy ADD COLUMN old_snapshot jsonb;
UPDATE public.invoice_session_fee_legacy l SET old_snapshot=i.snapshot FROM portal.invoices i WHERE i.id=l.issued_id;
