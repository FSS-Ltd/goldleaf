\set ON_ERROR_STOP on
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM portal.memberships m JOIN portal.families f ON f.id=m.family_id WHERE m.subject='existing-invoice-parent' AND m.revoked_at IS NULL AND f.display_name='Existing family') THEN RAISE EXCEPTION 'existing family or membership lost'; END IF;
END $$;
