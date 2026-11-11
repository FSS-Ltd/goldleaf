\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE onboarding_runtime NOLOGIN;
CREATE ROLE onboarding_public NOLOGIN;
GRANT USAGE ON SCHEMA portal TO onboarding_runtime;
GRANT EXECUTE ON FUNCTION portal.create_family(text,text,uuid), portal.active_memberships(text), portal.family_memberships(text,uuid), portal.revoke_membership(text,uuid), portal.issue_invitation(text,uuid,text,bytea,timestamptz), portal.revoke_invitation(text,uuid), portal.accept_invitation(text,text,bytea), portal.set_founding(text,uuid,boolean) TO onboarding_runtime;
GRANT USAGE ON SCHEMA public_offer TO onboarding_public;
GRANT SELECT ON public_offer.founding_availability TO onboarding_public;
DO $$ BEGIN
  IF has_table_privilege('onboarding_runtime', 'portal.memberships', 'SELECT, INSERT, UPDATE, DELETE') OR
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
RESET ROLE;
ROLLBACK;
