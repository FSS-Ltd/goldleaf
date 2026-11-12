\set ON_ERROR_STOP on
INSERT INTO portal.memberships(subject, role) VALUES ('ui-invoice-admin', 'admin'), ('ui-invoice-admin-two', 'admin'), ('ui-invoice-staff', 'staff');
INSERT INTO portal.families(id,display_name) VALUES ('82000000-0000-4000-8000-000000000001','Invoice UI family');
INSERT INTO portal.memberships(subject, role, family_id) VALUES ('ui-invoice-parent', 'parent', '82000000-0000-4000-8000-000000000001');
SELECT portal.save_billing_settings('ui-invoice-admin','Goldleaf Learning Ltd','51 Hurst rd',false,NULL,NULL,14,'Bank','weekly','2027-04-01');
SELECT portal.create_invoice_draft('ui-invoice-admin','82000000-0000-4000-8000-000000000001','Parent','Address','[{"description":"Tuition","quantity":1,"unit_amount_pence":6000,"service_date":"2020-01-01","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]') AS old_invoice \gset
SELECT portal.issue_invoice_checked('ui-invoice-admin', :'old_invoice', portal.invoice_issue_context('ui-invoice-admin', :'old_invoice'));
