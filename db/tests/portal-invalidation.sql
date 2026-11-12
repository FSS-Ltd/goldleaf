\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.event(subject text, kind text, id uuid) RETURNS text LANGUAGE sql AS $$ SELECT portal.resolve_portal_event(subject,kind,id,CASE WHEN subject='events-admin' THEN 'admin' WHEN subject='events-staff' THEN 'staff' ELSE 'parent' END) $$;
INSERT INTO portal.memberships(subject,role) VALUES ('events-admin','admin'),('events-staff','staff'),('events-staff','admin');
SELECT portal.create_family('events-admin','One','b1000000-0000-4000-8000-000000000001');
SELECT portal.create_family('events-admin','Two','b1000000-0000-4000-8000-000000000002');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('events-parent','parent','b1000000-0000-4000-8000-000000000001'),('events-other','parent','b1000000-0000-4000-8000-000000000002');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'b1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='events-staff';
INSERT INTO portal.invoices(id,family_id,recipient_name,recipient_address,created_by) SELECT 'b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Parent','Address',id FROM portal.memberships WHERE subject='events-admin';
DO $$ BEGIN
 IF pg_temp.event('events-parent','invoice_family','b2000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'draft leaked'; END IF;
 IF pg_temp.event('events-parent','admin_change','b2000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'admin event leaked'; END IF;
 IF portal.resolve_portal_event('events-staff','admin_change','b2000000-0000-4000-8000-000000000001','staff') IS NOT NULL THEN RAISE EXCEPTION 'dual-role staff admin event leaked'; END IF;
 IF portal.resolve_portal_event('events-staff','admin_change','b2000000-0000-4000-8000-000000000001','admin')<>'change' THEN RAISE EXCEPTION 'dual-role admin event missing'; END IF;
 IF pg_temp.event('events-staff','founding_profile','b1000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'founding leaked to staff'; END IF;
 IF pg_temp.event('events-staff','family_profile','b1000000-0000-4000-8000-000000000001')<>'change' THEN RAISE EXCEPTION 'assigned family profile missing'; END IF;
 IF pg_temp.event('events-parent','read_cursor',(SELECT id FROM portal.memberships WHERE subject='events-other')) IS NOT NULL THEN RAISE EXCEPTION 'other cursor leaked'; END IF;
 IF pg_temp.event('events-parent','read_cursor',(SELECT id FROM portal.memberships WHERE subject='events-parent'))<>'change' THEN RAISE EXCEPTION 'own cursor missing'; END IF;
END $$;
UPDATE portal.invoices SET invoice_number=123456, issued_at=clock_timestamp(), issued_by=(SELECT id FROM portal.memberships WHERE subject='events-admin'), snapshot='{}'::jsonb WHERE id='b2000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF pg_temp.event('events-parent','invoice_family','b2000000-0000-4000-8000-000000000001')<>'change' THEN RAISE EXCEPTION 'parent invoice missing'; END IF;
 IF pg_temp.event('events-other','invoice_family','b2000000-0000-4000-8000-000000000001') IS NOT NULL OR pg_temp.event('events-staff','invoice_family','b2000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'invoice scope leak'; END IF;
END $$;
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='events-parent';
DO $$ BEGIN
 IF pg_temp.event('events-parent','invoice_family','b2000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'revoked invoice event leaked'; END IF;
 IF pg_temp.event('events-parent','access',(SELECT id FROM portal.memberships WHERE subject='events-parent'))<>'access_changed' THEN RAISE EXCEPTION 'revocation missing'; END IF;
END $$;
ROLLBACK;
