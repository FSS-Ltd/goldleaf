\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject,role) VALUES ('views-admin','admin'),('views-staff','staff'),('views-otherstaff','staff');
SELECT portal.create_family('views-admin','First','a1000000-0000-4000-8000-000000000001');
SELECT portal.create_family('views-admin','Second','a1000000-0000-4000-8000-000000000002');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('views-admin','parent','a1000000-0000-4000-8000-000000000001'),('views-parent','parent','a1000000-0000-4000-8000-000000000001'),('views-parent2','parent','a1000000-0000-4000-8000-000000000002');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'a1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='views-staff';
SELECT portal.create_child('views-admin','a1000000-0000-4000-8000-000000000001','Child','a2000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('views-admin','a2000000-0000-4000-8000-000000000001','2027-01-01 10:00Z',120,'a3000000-0000-4000-8000-000000000001',NULL);
SELECT portal.send_family_message('views-parent','a1000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000001','Message');
INSERT INTO portal.memberships(subject,role) VALUES ('views-parent','admin');
SELECT portal.request_session_change('views-parent','a3000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001','Change');
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.message_family_summaries('views-admin','admin') WHERE id IN ('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002'))<>2 OR (SELECT count(*) FROM portal.message_family_summaries('views-parent','parent'))<>1 OR (SELECT count(*) FROM portal.message_family_summaries('views-staff','staff'))<>1 OR (SELECT count(*) FROM portal.message_family_summaries('views-otherstaff','staff'))<>0 THEN RAISE EXCEPTION 'family isolation failed'; END IF;
 IF portal.family_message_unread('views-parent','a1000000-0000-4000-8000-000000000001')<>'0' THEN RAISE EXCEPTION 'own prior role message counted unread'; END IF;
 IF (SELECT unread FROM portal.message_family_summaries('views-staff','staff'))<>'1' OR (SELECT unread FROM portal.message_family_summaries('views-parent','parent'))<>'0' THEN RAISE EXCEPTION 'unread scope failed'; END IF;
 IF (SELECT count(*) FROM portal.message_author_identities('views-staff','staff','a1000000-0000-4000-8000-000000000001'))<>1 THEN RAISE EXCEPTION 'author scope failed'; END IF;
 BEGIN PERFORM portal.message_author_identities('views-parent2','parent','a1000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'cross family author leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM portal.message_request_context('views-admin','admin'))<>1 OR (SELECT count(*) FROM portal.message_request_context('views-parent','parent'))<>1 OR (SELECT count(*) FROM portal.message_request_context('views-parent2','parent'))<>0 THEN RAISE EXCEPTION 'request scope failed'; END IF;
 BEGIN PERFORM portal.message_request_context('views-staff','staff'); RAISE EXCEPTION 'staff request leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM portal.message_sessions('views-parent','parent','a1000000-0000-4000-8000-000000000001'))<>1 THEN RAISE EXCEPTION 'session scope failed'; END IF;
END $$;
CREATE ROLE message_views_runtime NOLOGIN;
GRANT USAGE ON SCHEMA portal TO message_views_runtime;
GRANT EXECUTE ON FUNCTION portal.message_family_summaries(text,text),portal.message_author_identities(text,text,uuid),portal.message_sessions(text,text,uuid),portal.message_request_context(text,text),portal.message_view_thread(text,text,uuid),portal.send_message_as_role(text,text,uuid,uuid,text),portal.mark_messages_as_role(text,text,uuid,bigint) TO message_views_runtime;
DO $$ BEGIN
 IF has_table_privilege('message_views_runtime','portal.family_messages','SELECT') OR has_function_privilege('message_views_runtime','portal.require_message_view_role(text,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'runtime access too broad'; END IF;
END $$;
SET LOCAL ROLE message_views_runtime;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.message_family_summaries('views-parent','parent'))<>1 THEN RAISE EXCEPTION 'runtime summary unavailable'; END IF;
 BEGIN PERFORM portal.message_view_thread('views-parent2','parent','a1000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'runtime cross-family leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE role='parent' AND subject IN ('views-parent','views-admin');
DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='views-staff');
DO $$ BEGIN
 IF portal.family_message_unread('views-parent','a1000000-0000-4000-8000-000000000001')<>'0' OR (SELECT unread FROM portal.message_family_summaries('views-parent','admin') WHERE id='a1000000-0000-4000-8000-000000000001')<>'0' THEN RAISE EXCEPTION 'revoked own author counted unread'; END IF;
 BEGIN PERFORM portal.message_family_summaries('views-parent','parent'); RAISE EXCEPTION 'revoked parent read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.message_view_thread('views-admin','parent','a1000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'dual-role parent bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.send_message_as_role('views-admin','parent','a1000000-0000-4000-8000-000000000001',gen_random_uuid(),'no'); RAISE EXCEPTION 'dual-role write bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM portal.message_view_thread('views-admin','admin','a1000000-0000-4000-8000-000000000001'))<>1 THEN RAISE EXCEPTION 'legitimate admin lost'; END IF;
 IF EXISTS(SELECT 1 FROM portal.message_family_summaries('views-staff','staff')) THEN RAISE EXCEPTION 'unassigned staff family'; END IF;
END $$;
ROLLBACK;
