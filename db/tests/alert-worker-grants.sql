\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE alert_test_worker NOLOGIN;
GRANT USAGE ON SCHEMA portal TO alert_test_worker;
GRANT EXECUTE ON FUNCTION portal.alert_claim(integer), portal.alert_next_due(), portal.alert_gate(uuid,uuid), portal.alert_freeze(uuid,uuid,jsonb,text), portal.alert_finish(uuid,uuid,text,timestamptz) TO alert_test_worker;
INSERT INTO portal.memberships(subject,role) VALUES ('grant-admin','admin');
SELECT portal.create_family('grant-admin','Grant test','c1000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('grant-parent','parent','c1000000-0000-4000-8000-000000000001');
SELECT portal.send_family_message('grant-admin','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','test');
SET LOCAL ROLE alert_test_worker;
DO $$ DECLARE d uuid; t uuid; extra text; BEGIN
 SELECT string_agg(p.proname,',') INTO extra FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='portal' AND has_function_privilege(current_user,p.oid,'EXECUTE')
 AND p.proname NOT IN ('alert_claim','alert_next_due','alert_gate','alert_freeze','alert_finish');
 IF extra IS NOT NULL THEN RAISE EXCEPTION 'unexpected worker functions: %',extra; END IF;
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NULL OR NOT portal.alert_gate(d,t) THEN RAISE EXCEPTION 'worker claim or gate failed'; END IF;
 IF portal.alert_next_due() IS NULL THEN RAISE EXCEPTION 'worker due unavailable'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.alert_freeze(d,t,jsonb_build_object('from','sender@example.test','to','recipient@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost/portal'),'key')) THEN RAISE EXCEPTION 'worker freeze failed'; END IF;
 IF NOT portal.alert_finish(d,t,'sent',NULL) THEN RAISE EXCEPTION 'worker finish failed'; END IF;
 BEGIN PERFORM * FROM portal.alert_deliveries; RAISE EXCEPTION 'worker table access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE portal.alert_deliveries SET status='sent'; RAISE EXCEPTION 'worker table write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.message_attention('grant-admin','admin'); RAISE EXCEPTION 'worker runtime access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.require_admin('grant-admin'); RAISE EXCEPTION 'worker internal access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
CREATE ROLE alert_test_public NOLOGIN;
GRANT USAGE ON SCHEMA portal TO alert_test_public;
SET LOCAL ROLE alert_test_public;
DO $$ BEGIN
 BEGIN PERFORM portal.alert_next_due(); RAISE EXCEPTION 'public execute access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM portal.alert_events; RAISE EXCEPTION 'public table access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
