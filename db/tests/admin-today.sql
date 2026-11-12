\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE admin_today_runtime_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO admin_today_runtime_test;
GRANT EXECUTE ON FUNCTION portal.list_admin_sessions(text,date) TO admin_today_runtime_test;
INSERT INTO portal.memberships(subject,role) VALUES ('today-admin','admin'),('today-staff','staff');
SELECT portal.create_family('today-admin','Today family','81000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('today-parent','parent','81000000-0000-4000-8000-000000000001');
SELECT portal.create_child('today-admin','81000000-0000-4000-8000-000000000001','Today child','82000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('today-admin','82000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'83000000-0000-4000-8000-000000000001',NULL);
SELECT portal.schedule_child_session('today-admin','82000000-0000-4000-8000-000000000001','2026-03-28 23:59+00',120,'83000000-0000-4000-8000-000000000002',NULL);
SELECT portal.schedule_child_session('today-admin','82000000-0000-4000-8000-000000000001','2026-03-29 22:59+00',120,'83000000-0000-4000-8000-000000000003',NULL);
SELECT portal.schedule_child_session('today-admin','82000000-0000-4000-8000-000000000001','2026-03-29 23:00+00',120,'83000000-0000-4000-8000-000000000004',NULL);
SET LOCAL ROLE admin_today_runtime_test;
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.list_admin_sessions('today-admin','2026-03-29'))<>1 THEN RAISE EXCEPTION 'DST day boundary'; END IF;
 IF (SELECT count(*) FROM portal.list_admin_sessions('today-admin','2026-12-02'))<>0 THEN RAISE EXCEPTION 'outside day'; END IF;
 IF (SELECT count(*) FROM portal.list_admin_sessions('today-admin','2026-12-01'))<>1 THEN RAISE EXCEPTION 'admin session missing'; END IF;
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
