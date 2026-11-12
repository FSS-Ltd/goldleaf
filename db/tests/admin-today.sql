\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE admin_today_runtime_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO admin_today_runtime_test;
GRANT EXECUTE ON FUNCTION portal.list_admin_sessions(text,date) TO admin_today_runtime_test;
INSERT INTO portal.memberships(subject,role) VALUES ('today-admin','admin'),('today-staff','staff');
SELECT portal.create_family('today-admin','Today family','e2c8d59f-2d20-4bf1-a77f-4f68da3c2011');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('today-parent','parent','e2c8d59f-2d20-4bf1-a77f-4f68da3c2011');
SELECT portal.create_child('today-admin','e2c8d59f-2d20-4bf1-a77f-4f68da3c2011','Today child','f2c8d59f-2d20-4bf1-a77f-4f68da3c2011');
SELECT portal.schedule_child_session('today-admin','f2c8d59f-2d20-4bf1-a77f-4f68da3c2011','2026-12-01 10:00+00',120,'a2c8d59f-2d20-4bf1-a77f-4f68da3c2011',NULL);
SELECT portal.schedule_child_session('today-admin','f2c8d59f-2d20-4bf1-a77f-4f68da3c2011','2026-03-28 23:59+00',120,'a2c8d59f-2d20-4bf1-a77f-4f68da3c2012',NULL);
SELECT portal.schedule_child_session('today-admin','f2c8d59f-2d20-4bf1-a77f-4f68da3c2011','2026-03-29 22:59+00',120,'a2c8d59f-2d20-4bf1-a77f-4f68da3c2013',NULL);
SELECT portal.schedule_child_session('today-admin','f2c8d59f-2d20-4bf1-a77f-4f68da3c2011','2026-03-29 23:00+00',120,'a2c8d59f-2d20-4bf1-a77f-4f68da3c2014',NULL);
SET LOCAL ROLE admin_today_runtime_test;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.list_admin_sessions('today-admin','2026-03-29') WHERE id IN ('a2c8d59f-2d20-4bf1-a77f-4f68da3c2012','a2c8d59f-2d20-4bf1-a77f-4f68da3c2013','a2c8d59f-2d20-4bf1-a77f-4f68da3c2014'))<>1 THEN RAISE EXCEPTION 'DST day boundary'; END IF;
 IF EXISTS (SELECT 1 FROM portal.list_admin_sessions('today-admin','2026-12-02') WHERE id='a2c8d59f-2d20-4bf1-a77f-4f68da3c2011') THEN RAISE EXCEPTION 'outside day'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.list_admin_sessions('today-admin','2026-12-01') WHERE id='a2c8d59f-2d20-4bf1-a77f-4f68da3c2011') THEN RAISE EXCEPTION 'admin session missing'; END IF;
 BEGIN PERFORM portal.list_admin_sessions('today-parent','2026-12-01'); RAISE EXCEPTION 'parent listed admin sessions'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM portal.list_admin_sessions('today-staff','2026-12-01'); RAISE EXCEPTION 'staff listed admin sessions'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM portal.sessions; RAISE EXCEPTION 'runtime table access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE portal.memberships SET revoked_at=clock_timestamp() WHERE subject='today-admin';
SET LOCAL ROLE admin_today_runtime_test;
DO $$ BEGIN
 BEGIN PERFORM portal.list_admin_sessions('today-admin','2026-12-01'); RAISE EXCEPTION 'revoked admin listed sessions'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
