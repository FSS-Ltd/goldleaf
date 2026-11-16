\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject,role) VALUES ('lifecycle-admin','admin'),('lifecycle-dual','staff');
SELECT portal.create_family('lifecycle-admin','Lifecycle','e1000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('lifecycle-dual','parent','e1000000-0000-4000-8000-000000000001');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'e1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='lifecycle-dual' AND role='staff';
SELECT portal.send_family_message('lifecycle-admin','e1000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','test');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('lifecycle-late','parent','e1000000-0000-4000-8000-000000000001');
DO $$ DECLARE d uuid; old_token uuid; new_token uuid; payload jsonb:=jsonb_build_object('from','sender@example.test','to','recipient@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost/portal'); BEGIN
 IF (SELECT count(*) FROM portal.alert_deliveries)<>1 OR (SELECT count(*) FROM portal.alert_paths)<>2 OR EXISTS(SELECT 1 FROM portal.alert_deliveries WHERE subject='lifecycle-late') THEN RAISE EXCEPTION 'snapshot or subject deduplication'; END IF;
 SELECT delivery_id,lease_token INTO d,old_token FROM portal.alert_claim(60);
 UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='lifecycle-dual' AND role='parent';
 IF NOT portal.alert_gate(d,old_token) THEN RAISE EXCEPTION 'surviving staff path denied'; END IF;
 PERFORM portal.alert_freeze(d,old_token,payload,'stable-key');
 UPDATE portal.alert_deliveries SET lease_until=clock_timestamp()-interval '1 second' WHERE id=d;
 SELECT lease_token INTO new_token FROM portal.alert_claim(60) WHERE delivery_id=d;
 IF new_token IS NULL OR old_token=new_token OR portal.alert_finish(d,old_token,'sent',NULL) THEN RAISE EXCEPTION 'expired claim fencing'; END IF;
 UPDATE portal.alert_deliveries SET first_attempt_at=clock_timestamp()-interval '24 hours' WHERE id=d;
 IF EXISTS(SELECT 1 FROM portal.alert_freeze(d,new_token,payload,'stable-key')) THEN RAISE EXCEPTION 'expired frozen payload accepted'; END IF;
 IF NOT portal.alert_finish(d,new_token,'uncertain',NULL) THEN RAISE EXCEPTION 'uncertain completion failed'; END IF;
 IF (SELECT status FROM portal.alert_deliveries WHERE id=d)<>'uncertain' THEN RAISE EXCEPTION 'expired frozen job not uncertain'; END IF;
END $$;
-- Repeated worker crashes must not bypass the eight-claim limit.
UPDATE portal.alert_deliveries SET status='leased',lease_token=gen_random_uuid(),lease_until=clock_timestamp()-interval '1 second',attempts=8;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM portal.alert_claim(60)) THEN RAISE EXCEPTION 'claim limit bypassed after crashes'; END IF;
 IF (SELECT status FROM portal.alert_deliveries)<>'uncertain' THEN RAISE EXCEPTION 'exhausted job not uncertain'; END IF;
END $$;
ROLLBACK;
