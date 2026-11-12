\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE goldleaf_staff_delivery_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO goldleaf_staff_delivery_test;
GRANT EXECUTE ON FUNCTION portal.issue_staff_delivery(text,text,bytea,timestamptz,uuid), portal.list_staff_deliveries(text), portal.staff_delivery_recipient(text,uuid,bytea), portal.mark_staff_delivery(text,uuid,text), portal.set_staff_assignments(text,uuid,uuid[]), portal.revoke_staff_invitation(text,uuid), portal.accept_verified_invitation(text,text[],bytea,text), portal.list_staff(text), portal.list_staff_family_assignments(text,uuid), portal.list_assigned_staff_families(text), portal.set_founding(text,uuid,boolean), portal.read_billing_settings(text) TO goldleaf_staff_delivery_test;
INSERT INTO portal.memberships(subject, role) VALUES ('staff-delivery-admin', 'admin');
SELECT portal.create_family('staff-delivery-admin', 'Test family', '30000000-0000-0000-0000-000000000011');
SET LOCAL ROLE goldleaf_staff_delivery_test;
SELECT portal.issue_staff_delivery('staff-delivery-admin', 'staff@example.invalid', decode(repeat('41',32),'hex'), now() + interval '7 days', '40000000-0000-4000-8000-000000000011') AS invitation \gset
DO $$ BEGIN
  BEGIN PERFORM portal.list_staff_deliveries('not-admin'); RAISE EXCEPTION 'non-admin listed invitations'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.issue_staff_delivery('not-admin','staff@example.invalid',decode(repeat('42',32),'hex'),now()+interval '7 days','40000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'non-admin issued invitation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.issue_staff_delivery('staff-delivery-admin','staff@example.invalid',decode(repeat('42',32),'hex'),now()+interval '7 days','40000000-0000-4000-8000-000000000011'); RAISE EXCEPTION 'request replay accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM portal.accept_verified_invitation('staff-subject',ARRAY['staff@example.invalid'],decode(repeat('41',32),'hex'),'parent'); RAISE EXCEPTION 'wrong purpose accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_verified_invitation('staff-subject',ARRAY['wrong@example.invalid'],decode(repeat('41',32),'hex'),'staff'); RAISE EXCEPTION 'wrong email accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.mark_staff_delivery('staff-delivery-admin', :'invitation', 'sent');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.list_staff_deliveries('staff-delivery-admin') WHERE delivery_status='sent' AND active) THEN RAISE EXCEPTION 'sent status missing'; END IF;
  IF EXISTS (SELECT 1 FROM portal.staff_delivery_recipient('staff-delivery-admin', (SELECT id FROM portal.list_staff_deliveries('staff-delivery-admin') LIMIT 1), decode(repeat('41',32),'hex'))) THEN RAISE EXCEPTION 'sent invite available for resend'; END IF;
END $$;
SELECT portal.accept_verified_invitation('staff-subject',ARRAY['staff@example.invalid'],decode(repeat('41',32),'hex'),'staff') AS member \gset
SELECT portal.set_staff_assignments('staff-delivery-admin', :'member', ARRAY['30000000-0000-0000-0000-000000000011'::uuid]);
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.list_assigned_staff_families('staff-subject')) <> 1 THEN RAISE EXCEPTION 'staff assignment missing'; END IF;
  BEGIN PERFORM 1 FROM portal.staff_invitations; RAISE EXCEPTION 'runtime role read private table'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.set_founding('staff-subject','30000000-0000-0000-0000-000000000011',true); RAISE EXCEPTION 'staff changed founding status'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.read_billing_settings('staff-subject'); RAISE EXCEPTION 'staff read billing settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.set_staff_assignments('staff-subject',(SELECT id FROM portal.list_staff_deliveries('staff-delivery-admin') LIMIT 1),ARRAY[]::uuid[]); RAISE EXCEPTION 'staff changed assignments'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_verified_invitation('staff-subject',ARRAY['staff@example.invalid'],decode(repeat('41',32),'hex'),'staff'); RAISE EXCEPTION 'replay accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DO $$ BEGIN
  BEGIN PERFORM portal.set_staff_assignments('staff-delivery-admin',(SELECT id FROM portal.list_staff('staff-delivery-admin') WHERE subject='staff-subject'), ARRAY['30000000-0000-0000-0000-000000000099'::uuid]); RAISE EXCEPTION 'unknown family accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF (SELECT count(*) FROM portal.list_assigned_staff_families('staff-subject')) <> 1 THEN RAISE EXCEPTION 'invalid update changed assignments'; END IF;
END $$;
SELECT portal.set_staff_assignments('staff-delivery-admin', :'member', ARRAY[]::uuid[]);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('staff-subject')) THEN RAISE EXCEPTION 'staff assignment remained'; END IF; END $$;
SELECT portal.issue_staff_delivery('staff-delivery-admin', 'staff@example.invalid', decode(repeat('43',32),'hex'), now() + interval '7 days', '40000000-0000-4000-8000-000000000013') AS revoked \gset
SELECT portal.issue_staff_delivery('staff-delivery-admin', 'staff@example.invalid', decode(repeat('44',32),'hex'), now() + interval '7 days', '40000000-0000-4000-8000-000000000014') AS replacement \gset
DO $$ BEGIN
  BEGIN PERFORM portal.accept_verified_invitation('staff-subject',ARRAY['staff@example.invalid'],decode(repeat('43',32),'hex'),'staff'); RAISE EXCEPTION 'superseded invitation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.mark_staff_delivery('staff-delivery-admin', :'replacement', 'failed');
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM portal.list_staff_deliveries('staff-delivery-admin') WHERE delivery_status='failed' AND active) THEN RAISE EXCEPTION 'failed status missing'; END IF; END $$;
SELECT portal.revoke_staff_invitation('staff-delivery-admin', :'replacement');
DO $$ BEGIN
  BEGIN PERFORM portal.accept_verified_invitation('staff-subject',ARRAY['staff@example.invalid'],decode(repeat('44',32),'hex'),'staff'); RAISE EXCEPTION 'revoked invitation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
