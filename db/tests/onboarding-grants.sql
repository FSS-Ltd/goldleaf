\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE onboarding_runtime NOLOGIN;
CREATE ROLE onboarding_public NOLOGIN;
INSERT INTO portal.memberships(subject, role) VALUES ('grant-admin', 'admin');
GRANT USAGE ON SCHEMA portal TO onboarding_runtime;
GRANT EXECUTE ON FUNCTION portal.create_family(text,text,uuid), portal.active_memberships(text), portal.family_memberships(text,uuid), portal.revoke_membership(text,uuid), portal.issue_invitation(text,uuid,text,bytea,timestamptz), portal.revoke_invitation(text,uuid), portal.accept_invitation(text,text,bytea), portal.set_founding(text,uuid,boolean) TO onboarding_runtime;
GRANT EXECUTE ON FUNCTION portal.issue_staff_invitation(text,text,bytea,timestamptz), portal.revoke_staff_invitation(text,uuid), portal.accept_staff_invitation(text,text,bytea), portal.set_staff_family_access(text,uuid,uuid,boolean), portal.assigned_family_ids(text) TO onboarding_runtime;
GRANT USAGE ON SCHEMA public_offer TO onboarding_public;
GRANT SELECT ON public_offer.founding_availability TO onboarding_public;
DO $$ BEGIN
  IF has_table_privilege('onboarding_runtime', 'portal.staff_invitations', 'SELECT, INSERT, UPDATE, DELETE') OR
     has_table_privilege('onboarding_runtime', 'portal.staff_family_assignments', 'SELECT, INSERT, UPDATE, DELETE') OR
     has_table_privilege('onboarding_runtime', 'portal.invitation_digests', 'SELECT, INSERT, UPDATE, DELETE') OR
     has_function_privilege('onboarding_runtime', 'portal.register_invitation_digest()', 'EXECUTE') OR
     has_function_privilege('onboarding_public', 'portal.assigned_family_ids(text)', 'EXECUTE') OR
     has_table_privilege('onboarding_runtime', 'portal.memberships', 'SELECT, INSERT, UPDATE, DELETE') OR
     has_function_privilege('onboarding_runtime', 'portal.require_admin(text)', 'EXECUTE') OR
     has_schema_privilege('onboarding_public', 'portal', 'USAGE') OR
     has_function_privilege('onboarding_public', 'portal.create_family(text,text,uuid)', 'EXECUTE') OR
     NOT has_table_privilege('onboarding_public', 'public_offer.founding_availability', 'SELECT') THEN
    RAISE EXCEPTION 'unexpected grant';
  END IF;
END $$;
SET LOCAL ROLE onboarding_public;
SELECT * FROM public_offer.founding_availability;
RESET ROLE;
SET LOCAL ROLE onboarding_runtime;
SELECT * FROM portal.active_memberships('unknown');
SELECT * FROM portal.assigned_family_ids('unknown');
CREATE TEMP TABLE init_tmp(i int);
CREATE FUNCTION pg_temp.hook(pg_catalog.uuid) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO portal.families(display_name) VALUES ('temp exploit marker');
  RETURN true;
END $$;
CREATE DOMAIN pg_temp.uuid AS pg_catalog.uuid CHECK (pg_temp.hook(VALUE));
SELECT portal.create_family('grant-admin', 'Expected data');
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.families WHERE display_name = 'temp exploit marker') THEN
    RAISE EXCEPTION 'temporary type executed in definer context';
  END IF;
END $$;
ROLLBACK;
