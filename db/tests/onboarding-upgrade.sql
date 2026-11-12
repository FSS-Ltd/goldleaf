\set ON_ERROR_STOP on
\ir ../migrations/0001_founding_availability.sql
\ir ../migrations/0002_seed_founding_slots.sql
INSERT INTO portal.families(id) VALUES ('10000000-0000-0000-0000-000000000001');
UPDATE portal.founding_slots SET family_id = '10000000-0000-0000-0000-000000000001' WHERE slot = 1;
\ir ../migrations/0003_portal_onboarding.sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.founding_slots WHERE slot = 1 AND family_id = '10000000-0000-0000-0000-000000000001')
     OR NOT EXISTS (SELECT 1 FROM public_offer.founding_availability WHERE total = 5 AND remaining = 4)
     OR NOT EXISTS (SELECT 1 FROM portal.families WHERE id = '10000000-0000-0000-0000-000000000001' AND display_name IS NULL) THEN
    RAISE EXCEPTION 'existing founding family did not survive migration';
  END IF;
END $$;
UPDATE portal.founding_slots SET family_id = NULL WHERE slot = 1;
DELETE FROM portal.families WHERE id = '10000000-0000-0000-0000-000000000001';
