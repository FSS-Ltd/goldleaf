\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE learning_runtime_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO learning_runtime_test;
GRANT EXECUTE ON FUNCTION portal.create_child(text,uuid,text,uuid),portal.rename_child(text,uuid,text),portal.list_children(text,uuid),portal.schedule_child_session(text,uuid,timestamptz,integer,uuid,text),portal.set_session_location(text,uuid,text),portal.reschedule_child_session(text,uuid,timestamptz),portal.list_child_sessions(text,uuid),portal.update_session(text,uuid,text,text),portal.learning_workspace(text,uuid),portal.save_private_note(text,uuid,text,integer),portal.save_learning_draft(text,uuid,text,smallint,text,text,integer),portal.preview_learning_draft(text,uuid,integer),portal.publish_learning_draft(text,uuid,integer,uuid,text),portal.list_published_learning(text,uuid,uuid) TO learning_runtime_test;
INSERT INTO portal.memberships(subject,role) VALUES ('learning-admin','admin'),('learning-staff','staff'),('learning-unassigned','staff');
SELECT portal.create_family('learning-admin','First','10000000-0000-4000-8000-000000000001');
SELECT portal.create_family('learning-admin','Second','10000000-0000-4000-8000-000000000002');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('parent-one','parent','10000000-0000-4000-8000-000000000001'),('parent-two','parent','10000000-0000-4000-8000-000000000002');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'10000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='learning-staff';
DO $$ BEGIN
 IF has_function_privilege('learning_runtime_test','portal.require_family_worker(text,uuid)','EXECUTE') OR has_function_privilege('learning_runtime_test','portal.learning_fingerprint(uuid,uuid,uuid,integer,text,smallint,text,text)','EXECUTE') THEN RAISE EXCEPTION 'internal helper granted'; END IF;
END $$;
SET LOCAL ROLE learning_runtime_test;
SELECT portal.create_child('learning-admin','10000000-0000-4000-8000-000000000001','Child','20000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('learning-admin','20000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'30000000-0000-4000-8000-000000000001','  Actual venue  ');
SELECT portal.rename_child('learning-admin','20000000-0000-4000-8000-000000000001','Renamed child');
SELECT portal.reschedule_child_session('learning-admin','30000000-0000-4000-8000-000000000001','2026-12-01 11:00+00');
SELECT portal.update_session('learning-staff','30000000-0000-4000-8000-000000000001','in_progress',NULL);
DO $$ BEGIN
 IF (SELECT location_label FROM portal.list_child_sessions('parent-one','10000000-0000-4000-8000-000000000001')) <> 'Actual venue' THEN RAISE EXCEPTION 'session location missing'; END IF;
 IF (SELECT attendance FROM portal.list_child_sessions('parent-one','10000000-0000-4000-8000-000000000001')) <> 'not_recorded' THEN RAISE EXCEPTION 'starting recorded attendance'; END IF;
 BEGIN PERFORM portal.rename_child('learning-staff','20000000-0000-4000-8000-000000000001','No'); RAISE EXCEPTION 'staff renamed child'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.reschedule_child_session('learning-staff','30000000-0000-4000-8000-000000000001',now()); RAISE EXCEPTION 'staff rescheduled'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.learning_workspace('parent-one','30000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'parent accessed workspace'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.learning_workspace('learning-unassigned','30000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'unassigned staff accessed workspace'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.list_children('parent-two','10000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'cross family read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.learning_workspace('learning-staff','30000000-0000-4000-8000-000000000099'); RAISE EXCEPTION 'guessed session read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM portal.session_private_notes; RAISE EXCEPTION 'direct private access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.save_private_note('learning-staff','30000000-0000-4000-8000-000000000001','private text',0);
SELECT portal.save_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001','parent draft',2::smallint,'focus','practice',0);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM portal.list_published_learning('parent-one','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')) THEN RAISE EXCEPTION 'draft leaked'; END IF;
 BEGIN PERFORM portal.save_private_note('learning-staff','30000000-0000-4000-8000-000000000001','overwrite',0); RAISE EXCEPTION 'stale note accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM portal.publish_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001',2,'40000000-0000-4000-8000-000000000001',repeat('0',64)); RAISE EXCEPTION 'stale publication accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
DO $$ BEGIN
 BEGIN PERFORM portal.publish_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001',1,'40000000-0000-4000-8000-000000000001',repeat('0',64)); RAISE EXCEPTION 'mismatched preview published'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT fingerprint FROM portal.preview_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001',1) \gset
SELECT portal.publish_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001',1,'40000000-0000-4000-8000-000000000001',:'fingerprint') AS published \gset
SELECT portal.publish_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001',1,'40000000-0000-4000-8000-000000000001',:'fingerprint') = :'published'::uuid AS same_publication \gset
\if :same_publication
\else
\quit 1
\endif
SELECT portal.save_learning_draft('learning-staff','30000000-0000-4000-8000-000000000001','new private draft',NULL,NULL,NULL,1);
DO $$ BEGIN
 IF (SELECT body FROM portal.list_published_learning('parent-one','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')) <> 'parent draft' THEN RAISE EXCEPTION 'published snapshot changed'; END IF;
 IF EXISTS (SELECT 1 FROM portal.list_published_learning('parent-two','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001')) THEN RAISE EXCEPTION 'cross family publication leaked'; END IF;
END $$;
RESET ROLE;
DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='learning-staff');
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='parent-one';
SET LOCAL ROLE learning_runtime_test;
DO $$ BEGIN
 BEGIN PERFORM portal.list_published_learning('parent-one','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'revoked parent read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.save_private_note('learning-staff','30000000-0000-4000-8000-000000000001','denied',1); RAISE EXCEPTION 'revoked staff wrote'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
