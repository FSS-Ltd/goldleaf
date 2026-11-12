\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE session_ui_runtime_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO session_ui_runtime_test;
GRANT EXECUTE ON FUNCTION portal.read_scoped_session(text,uuid,text), portal.list_staff_sessions(text), portal.list_parent_latest_learning(text), portal.save_learning_draft(text,uuid,text,smallint,text,text,text[],integer), portal.preview_learning_draft(text,uuid,integer), portal.publish_learning_draft(text,uuid,integer,uuid,text) TO session_ui_runtime_test;
INSERT INTO portal.memberships(subject,role) VALUES ('ui-admin','admin'),('ui-staff','staff'),('ui-unassigned','staff'),('ui-dual','staff');
SELECT portal.create_family('ui-admin','Family one','71000000-0000-4000-8000-000000000001');
SELECT portal.create_family('ui-admin','Family two','71000000-0000-4000-8000-000000000002');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('ui-parent','parent','71000000-0000-4000-8000-000000000001'),('ui-dual','parent','71000000-0000-4000-8000-000000000001');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'71000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='ui-staff';
SELECT portal.create_child('ui-admin','71000000-0000-4000-8000-000000000001','Child one','72000000-0000-4000-8000-000000000001');
SELECT portal.create_child('ui-admin','71000000-0000-4000-8000-000000000002','Child two','72000000-0000-4000-8000-000000000002');
SELECT portal.schedule_child_session('ui-admin','72000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'73000000-0000-4000-8000-000000000001','Venue');
SELECT portal.schedule_child_session('ui-admin','72000000-0000-4000-8000-000000000002','2026-12-01 11:00+00',120,'73000000-0000-4000-8000-000000000002',NULL);
SET LOCAL ROLE session_ui_runtime_test;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.list_staff_sessions('ui-staff'))<>1 THEN RAISE EXCEPTION 'staff schedule scope'; END IF;
 IF EXISTS (SELECT 1 FROM portal.list_staff_sessions('ui-unassigned')) THEN RAISE EXCEPTION 'unassigned staff read'; END IF;
 IF (SELECT child_name FROM portal.read_scoped_session('ui-admin','73000000-0000-4000-8000-000000000001','admin'))<>'Child one' THEN RAISE EXCEPTION 'admin session missing'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_scoped_session('ui-parent','73000000-0000-4000-8000-000000000001','admin')) THEN RAISE EXCEPTION 'parent impersonated admin'; END IF;
 IF (SELECT child_name FROM portal.read_scoped_session('ui-parent','73000000-0000-4000-8000-000000000001','parent'))<>'Child one' THEN RAISE EXCEPTION 'parent session missing'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_scoped_session('ui-dual','73000000-0000-4000-8000-000000000001','staff')) THEN RAISE EXCEPTION 'parent membership bypassed staff assignment'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_scoped_session('ui-parent','73000000-0000-4000-8000-000000000002','parent')) THEN RAISE EXCEPTION 'cross family session read'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_scoped_session('ui-staff','73000000-0000-4000-8000-000000000099','staff')) THEN RAISE EXCEPTION 'guessed session read'; END IF;
 BEGIN PERFORM portal.list_staff_sessions('ui-parent'); RAISE EXCEPTION 'parent listed staff schedule'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM portal.sessions; RAISE EXCEPTION 'runtime table access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM portal.learning_publication_operations; RAISE EXCEPTION 'runtime operation table access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.save_learning_draft('ui-admin','73000000-0000-4000-8000-000000000002','Other family',NULL,NULL,NULL,ARRAY[]::text[],0);
SELECT fingerprint AS other_fingerprint FROM portal.preview_learning_draft('ui-admin','73000000-0000-4000-8000-000000000002',1) \gset
SELECT portal.publish_learning_draft('ui-admin','73000000-0000-4000-8000-000000000002',1,'74000000-0000-4000-8000-000000000003',:'other_fingerprint');
SELECT portal.save_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001','Update',NULL,NULL,NULL,ARRAY[]::text[],0);
SELECT fingerprint FROM portal.preview_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',1) \gset
SELECT portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',1,'74000000-0000-4000-8000-000000000001',:'fingerprint') AS publication \gset
SELECT portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',1,'74000000-0000-4000-8000-000000000002',:'fingerprint') = :'publication'::uuid AS retry_matches \gset
SELECT portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',1,'74000000-0000-4000-8000-000000000002',:'fingerprint') = :'publication'::uuid AS bound_retry_matches \gset
\if :bound_retry_matches
\else
\quit 1
\endif
\if :retry_matches
\else
\quit 1
\endif
RESET ROLE;
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'71000000-0000-4000-8000-000000000002' FROM portal.memberships WHERE subject='ui-staff';
SET LOCAL ROLE session_ui_runtime_test;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.list_parent_latest_learning('ui-parent'))<>1 OR EXISTS (SELECT 1 FROM portal.list_parent_latest_learning('ui-parent') WHERE family_id='71000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'latest learning leaked family'; END IF;
 BEGIN PERFORM portal.list_parent_latest_learning('ui-unassigned'); RAISE EXCEPTION 'staff listed parent latest'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.save_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001','Changed',NULL,NULL,NULL,ARRAY[]::text[],1);
SELECT set_config('learning.test_fingerprint', :'fingerprint', true);
DO $$ BEGIN
 BEGIN PERFORM portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',2,'74000000-0000-4000-8000-000000000002',current_setting('learning.test_fingerprint')); RAISE EXCEPTION 'operation reused for another version'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000001',1,'74000000-0000-4000-8000-000000000002',repeat('0',64)); RAISE EXCEPTION 'operation reused with another fingerprint'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM portal.publish_learning_draft('ui-admin','73000000-0000-4000-8000-000000000001',1,'74000000-0000-4000-8000-000000000002',current_setting('learning.test_fingerprint')); RAISE EXCEPTION 'operation reused by another actor'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM portal.publish_learning_draft('ui-staff','73000000-0000-4000-8000-000000000002',1,'74000000-0000-4000-8000-000000000002',current_setting('learning.test_fingerprint')); RAISE EXCEPTION 'operation reused for another session'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='ui-staff');
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='ui-parent';
SET LOCAL ROLE session_ui_runtime_test;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM portal.list_staff_sessions('ui-staff')) THEN RAISE EXCEPTION 'removed assignment read'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_scoped_session('ui-parent','73000000-0000-4000-8000-000000000001','parent')) THEN RAISE EXCEPTION 'revoked parent read'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
