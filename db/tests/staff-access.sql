\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE staff_access_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO staff_access_test;
GRANT EXECUTE ON FUNCTION portal.issue_staff_invitation(text,text,bytea,timestamptz), portal.revoke_staff_invitation(text,uuid), portal.set_staff_family_access(text,uuid,uuid,boolean), portal.accept_verified_invitation(text,text[],bytea,text), portal.list_staff(text), portal.list_pending_staff_invitations(text), portal.list_staff_family_assignments(text,uuid), portal.list_assigned_staff_families(text) TO staff_access_test;
INSERT INTO portal.memberships(subject,role) VALUES ('access-admin','admin');
INSERT INTO portal.memberships(subject,role,revoked_at) VALUES ('suspended-admin','admin',now());
INSERT INTO portal.families(id,display_name) VALUES ('30000000-0000-0000-0000-000000000001','Family A'), ('30000000-0000-0000-0000-000000000002','Family B');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('access-parent','parent','30000000-0000-0000-0000-000000000001');
SET LOCAL ROLE staff_access_test;
SELECT portal.issue_staff_invitation('access-admin','staff@example.com',decode(repeat('c1',32),'hex'),now()+interval '7 days') AS invite \gset
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.list_pending_staff_invitations('access-admin')) <> 1 THEN RAISE EXCEPTION 'pending invitation missing'; END IF;
  BEGIN PERFORM portal.list_pending_staff_invitations('suspended-admin'); RAISE EXCEPTION 'suspended admin listed invitations'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.issue_staff_invitation('access-parent','bad@example.com',decode(repeat('c9',32),'hex'),now()+interval '1 day'); RAISE EXCEPTION 'parent invited staff'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.list_pending_staff_invitations('access-parent'); RAISE EXCEPTION 'parent listed invitations'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_verified_invitation('access-staff',ARRAY['wrong@example.com'],decode(repeat('c1',32),'hex'),'staff'); RAISE EXCEPTION 'wrong email accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM portal.accept_verified_invitation('access-staff',ARRAY['staff@example.com'],decode(repeat('c1',32),'hex'),'staff');
  BEGIN PERFORM portal.accept_verified_invitation('access-staff',ARRAY['staff@example.com'],decode(repeat('c1',32),'hex'),'staff'); RAISE EXCEPTION 'replay accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM portal.list_pending_staff_invitations('access-admin')) OR EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('access-staff')) THEN RAISE EXCEPTION 'unexpected invite or assignment'; END IF;
END $$;
SELECT id AS staff_id FROM portal.list_staff('access-admin') WHERE subject='access-staff' \gset
SELECT portal.set_staff_family_access('access-admin',:'staff_id','30000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.list_assigned_staff_families('access-staff')) <> 1 OR EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('access-parent')) OR EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('other-staff')) THEN RAISE EXCEPTION 'family scope failed'; END IF;
  IF (SELECT count(*) FROM portal.list_staff_family_assignments('access-admin',(SELECT id FROM portal.list_staff('access-admin') WHERE subject='access-staff'))) <> 1 THEN RAISE EXCEPTION 'admin assignment list failed'; END IF;
  BEGIN PERFORM portal.set_staff_family_access('access-admin',(SELECT id FROM portal.list_staff('access-admin') WHERE subject='access-staff'),gen_random_uuid(),true); RAISE EXCEPTION 'unknown family accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM portal.issue_staff_invitation('access-staff','bad@example.com',decode(repeat('c9',32),'hex'),now()+interval '1 day'); RAISE EXCEPTION 'staff invited staff'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.list_staff_family_assignments('access-staff',(SELECT id FROM portal.list_staff('access-admin') LIMIT 1)); RAISE EXCEPTION 'staff listed assignments'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.list_staff_family_assignments('access-admin',gen_random_uuid()); RAISE EXCEPTION 'unknown staff accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM portal.set_staff_family_access('access-parent',gen_random_uuid(),gen_random_uuid(),true); RAISE EXCEPTION 'parent assigned access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.set_staff_family_access('access-admin',:'staff_id','30000000-0000-0000-0000-000000000001',false);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('access-staff')) THEN RAISE EXCEPTION 'assignment revoke failed'; END IF; END $$;
SELECT portal.issue_staff_invitation('access-admin','revoked@example.com',decode(repeat('c2',32),'hex'),now()+interval '7 days') AS revoked_invite \gset
SELECT portal.revoke_staff_invitation('access-admin',:'revoked_invite');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.list_pending_staff_invitations('access-admin')) THEN RAISE EXCEPTION 'revoked invitation listed'; END IF;
  BEGIN PERFORM portal.accept_verified_invitation('revoked',ARRAY['revoked@example.com'],decode(repeat('c2',32),'hex'),'staff'); RAISE EXCEPTION 'revoked invitation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_table_privilege(current_user,'portal.staff_invitations','SELECT') OR has_table_privilege(current_user,'portal.staff_family_assignments','SELECT') OR has_function_privilege('public','portal.list_pending_staff_invitations(text)','EXECUTE') THEN RAISE EXCEPTION 'unexpected privileges'; END IF;
END $$;
RESET ROLE;
SELECT portal.set_staff_family_access('access-admin',:'staff_id','30000000-0000-0000-0000-000000000001',true);
SELECT portal.revoke_membership('access-admin',:'staff_id');
SET LOCAL ROLE staff_access_test;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.list_assigned_staff_families('access-staff')) THEN RAISE EXCEPTION 'revoked staff retained assignment'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
