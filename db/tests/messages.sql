\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject,role) VALUES ('msg-admin','admin'),('msg-staff','staff'),('msg-otherstaff','staff');
SELECT portal.create_family('msg-admin','First','91000000-0000-4000-8000-000000000001');
SELECT portal.create_family('msg-admin','Second','91000000-0000-4000-8000-000000000002');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('msg-parent','parent','91000000-0000-4000-8000-000000000001'),('msg-parent2','parent','91000000-0000-4000-8000-000000000002');
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'91000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='msg-staff';
SELECT portal.create_child('msg-admin','91000000-0000-4000-8000-000000000001','Test','92000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('msg-admin','92000000-0000-4000-8000-000000000001','2027-01-01 10:00Z',120,'93000000-0000-4000-8000-000000000001',NULL);
DO $$ DECLARE a bigint; b bigint; original timestamptz; BEGIN
 a:=portal.send_family_message('msg-parent','91000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001',' hello ');
 IF a<>portal.send_family_message('msg-parent','91000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','hello') THEN RAISE EXCEPTION 'replay changed id'; END IF;
 BEGIN PERFORM portal.send_family_message('msg-parent','91000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','changed'); RAISE EXCEPTION 'changed replay accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 b:=portal.send_family_message('msg-staff','91000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','reply');
 IF portal.family_message_unread('msg-parent','91000000-0000-4000-8000-000000000001')<>'1' THEN RAISE EXCEPTION 'unread count'; END IF;
 PERFORM portal.mark_family_messages_read('msg-parent','91000000-0000-4000-8000-000000000001',a);
 IF portal.family_message_unread('msg-parent','91000000-0000-4000-8000-000000000001')<>'1' THEN RAISE EXCEPTION 'read beyond visible'; END IF;
 PERFORM portal.mark_family_messages_read('msg-parent','91000000-0000-4000-8000-000000000001',b);
 IF portal.family_message_unread('msg-parent','91000000-0000-4000-8000-000000000001')<>'0' THEN RAISE EXCEPTION 'read failed'; END IF;
 BEGIN PERFORM portal.list_family_messages('msg-parent2','91000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'cross family leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.list_family_messages('msg-otherstaff','91000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'unassigned staff leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT starts_at INTO original FROM portal.sessions WHERE id='93000000-0000-4000-8000-000000000001';
 PERFORM portal.request_session_change('msg-parent','93000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','Please change');
 IF (SELECT starts_at FROM portal.sessions WHERE id='93000000-0000-4000-8000-000000000001')<>original THEN RAISE EXCEPTION 'request changed session'; END IF;
 PERFORM portal.resolve_session_change('msg-admin','95000000-0000-4000-8000-000000000001','Agreed','2027-01-02 10:00Z');
 PERFORM portal.resolve_session_change('msg-admin','95000000-0000-4000-8000-000000000001','Agreed','2027-01-02 10:00Z');
 BEGIN PERFORM portal.resolve_session_change('msg-admin','95000000-0000-4000-8000-000000000001','Changed',NULL); RAISE EXCEPTION 'changed resolution replay'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT starts_at FROM portal.sessions WHERE id='93000000-0000-4000-8000-000000000001')=original THEN RAISE EXCEPTION 'reschedule missing'; END IF;
END $$;
DO $$ BEGIN
 IF portal.resolve_portal_event('msg-parent','session','93000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'private session event leaked'; END IF;
 IF portal.resolve_portal_event('msg-parent','session_public','93000000-0000-4000-8000-000000000001') <> 'change' THEN RAISE EXCEPTION 'public session event lost'; END IF;
 IF portal.resolve_portal_event('msg-parent2','session_public','93000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'foreign session event leaked'; END IF;
 IF portal.resolve_portal_event('msg-staff','session','93000000-0000-4000-8000-000000000001') <> 'change' THEN RAISE EXCEPTION 'assigned staff event missing'; END IF;
 IF portal.resolve_portal_event('msg-staff','request','95000000-0000-4000-8000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'owned request leaked'; END IF;
 IF portal.resolve_portal_event('msg-parent','request','95000000-0000-4000-8000-000000000001') <> 'change' THEN RAISE EXCEPTION 'owner request missing'; END IF;
END $$;
CREATE ROLE message_runtime_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO message_runtime_test;
GRANT EXECUTE ON FUNCTION portal.send_family_message(text,uuid,uuid,text),portal.list_family_messages(text,uuid),portal.mark_family_messages_read(text,uuid,bigint),portal.family_message_unread(text,uuid),portal.request_session_change(text,uuid,uuid,text),portal.list_session_change_requests(text,uuid),portal.resolve_session_change(text,uuid,text,timestamptz),portal.portal_event_active(text),portal.resolve_portal_event(text,text,uuid) TO message_runtime_test;
DO $$ BEGIN
 IF has_table_privilege('message_runtime_test','portal.family_messages','SELECT') OR has_function_privilege('message_runtime_test','portal.require_message_access(text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'runtime privilege leak'; END IF;
END $$;
SET LOCAL ROLE message_runtime_test;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.list_family_messages('msg-parent','91000000-0000-4000-8000-000000000001'))<>2 THEN RAISE EXCEPTION 'runtime read failed'; END IF;
 BEGIN PERFORM portal.list_family_messages('msg-parent2','91000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'runtime cross-family leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF portal.resolve_portal_event('msg-parent','access',(SELECT id FROM portal.memberships WHERE subject='msg-parent2')) IS NOT NULL THEN RAISE EXCEPTION 'other membership event leaked'; END IF;
END $$;
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='msg-parent';
DO $$ BEGIN
 IF portal.resolve_portal_event('msg-parent','access',(SELECT id FROM portal.memberships WHERE subject='msg-parent')) <> 'access_changed' THEN RAISE EXCEPTION 'own revocation event missing'; END IF;
 IF portal.portal_event_active('msg-parent') THEN RAISE EXCEPTION 'revoked session remained active'; END IF;
END $$;
DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='msg-staff');
SET LOCAL ROLE message_runtime_test;
DO $$ BEGIN
 BEGIN PERFORM portal.list_family_messages('msg-parent','91000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'revoked parent read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.send_family_message('msg-staff','91000000-0000-4000-8000-000000000001',gen_random_uuid(),'no'); RAISE EXCEPTION 'revoked staff write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
