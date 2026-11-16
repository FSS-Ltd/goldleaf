\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject,role) VALUES ('alert-admin','admin'),('alert-staff','staff'),('alert-other','staff');
SELECT portal.create_family('alert-admin','Test','b1000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('alert-parent','parent','b1000000-0000-4000-8000-000000000001'),('alert-parent2','parent','b1000000-0000-4000-8000-000000000001');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'b1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='alert-staff';
SELECT portal.create_child('alert-admin','b1000000-0000-4000-8000-000000000001','Child','b2000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('alert-admin','b2000000-0000-4000-8000-000000000001','2027-01-01 10:00Z',120,'b3000000-0000-4000-8000-000000000001',NULL);
SELECT portal.send_family_message('alert-parent','b1000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','secret');
SELECT portal.send_message_as_role('alert-parent','parent','b1000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','secret');
SELECT portal.request_session_change('alert-parent','b3000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001','private');
DO $$ DECLARE d uuid; t uuid; BEGIN
 IF (SELECT count(*) FROM portal.alert_events WHERE kind='message.created')<>1 OR (SELECT count(*) FROM portal.alert_deliveries d JOIN portal.alert_events e ON e.id=d.event_id WHERE e.kind='message.created')<>3 THEN RAISE EXCEPTION 'message replay or recipients'; END IF;
 IF EXISTS(SELECT 1 FROM portal.alert_deliveries d JOIN portal.alert_events e ON e.id=d.event_id WHERE (e.kind='message.created' AND d.subject IN ('alert-parent','alert-other')) OR (e.kind='request.created' AND d.subject<>'alert-admin')) THEN RAISE EXCEPTION 'recipient leak'; END IF;
 IF (SELECT open_requests FROM portal.message_attention('alert-admin','admin'))<>'1' OR (SELECT open_requests FROM portal.message_attention('alert-parent','parent'))<>'0' THEN RAISE EXCEPTION 'attention scope'; END IF;
 BEGIN PERFORM portal.message_attention('alert-other','parent'); RAISE EXCEPTION 'invalid role accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NULL OR NOT portal.alert_gate(d,t) OR portal.alert_finish(d,gen_random_uuid(),'sent',NULL) THEN RAISE EXCEPTION 'claim fence'; END IF;
 PERFORM portal.alert_freeze(d,t,jsonb_build_object('from','test@example.test','to','recipient@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost:3000/portal'),'key');
 IF (SELECT payload FROM portal.alert_freeze(d,t,jsonb_build_object('from','test@example.test','to','changed@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost:3000/portal'),'other'))<>jsonb_build_object('from','test@example.test','to','recipient@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost:3000/portal') THEN RAISE EXCEPTION 'payload changed'; END IF;
 BEGIN
  PERFORM portal.alert_freeze(d,t,jsonb_build_object('from','a','to','b','subject','secret','text','private'),'bad');
  RAISE EXCEPTION 'private payload accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF NOT portal.alert_finish(d,t,'retry',clock_timestamp()+interval '24 hours') OR portal.alert_finish(d,t,'sent',NULL) THEN RAISE EXCEPTION 'finish fence'; END IF;
 IF (SELECT status FROM portal.alert_deliveries WHERE id=d)<>'uncertain' THEN RAISE EXCEPTION 'retry cutoff'; END IF;
END $$;
SELECT portal.resolve_session_change('alert-admin','b5000000-0000-4000-8000-000000000001','done',NULL);
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.alert_deliveries d JOIN portal.alert_events e ON e.id=d.event_id WHERE e.kind='request.resolved' AND d.subject='alert-parent')<>1 OR EXISTS(SELECT 1 FROM portal.alert_deliveries d JOIN portal.alert_events e ON e.id=d.event_id WHERE e.kind='request.resolved' AND d.subject<>'alert-parent') THEN RAISE EXCEPTION 'resolution leak'; END IF;
END $$;
DO $$ DECLARE d uuid; t uuid; BEGIN
 -- Reassigning staff cannot revive the original assignment path.
 UPDATE portal.alert_deliveries SET due_at=clock_timestamp()+interval '1 day' WHERE status='pending';
 DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='alert-staff');
 INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'b1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='alert-staff';
 UPDATE portal.alert_deliveries SET due_at=clock_timestamp()-interval '1 second' WHERE subject='alert-staff';
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NULL OR portal.alert_gate(d,t) THEN RAISE EXCEPTION 'reassignment restored old path'; END IF;
 IF NOT portal.alert_finish(d,t,'cancelled',NULL) THEN RAISE EXCEPTION 'cancel failed'; END IF;
 -- Reaccepting the original parent cannot revive a queued resolution.
 UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='alert-parent' AND role='parent';
 UPDATE portal.memberships SET revoked_at=NULL WHERE subject='alert-parent' AND role='parent';
 UPDATE portal.alert_deliveries SET due_at=clock_timestamp()-interval '1 second' WHERE subject='alert-parent' AND status='pending';
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NULL OR portal.alert_gate(d,t) THEN RAISE EXCEPTION 'reacceptance restored old path'; END IF;
 IF NOT portal.alert_finish(d,t,'cancelled',NULL) THEN RAISE EXCEPTION 'cancel failed'; END IF;
 IF has_function_privilege('public','portal.alert_claim(integer)','EXECUTE') OR has_table_privilege('public','portal.alert_deliveries','SELECT') THEN RAISE EXCEPTION 'public worker privilege'; END IF;
END $$;
ROLLBACK;
