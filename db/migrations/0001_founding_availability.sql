-- Forward-only foundation. Apply 0002 after this migration.
BEGIN;
CREATE SCHEMA portal;
CREATE SCHEMA public_offer;
REVOKE ALL ON SCHEMA portal, public_offer FROM PUBLIC;

CREATE TABLE portal.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portal.founding_slots (
  slot smallint PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
  family_id uuid UNIQUE REFERENCES portal.families(id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA portal FROM PUBLIC;

CREATE VIEW public_offer.founding_availability AS
SELECT count(*)::integer AS total,
       count(*) FILTER (WHERE family_id IS NULL)::integer AS remaining
FROM portal.founding_slots;
REVOKE ALL ON public_offer.founding_availability FROM PUBLIC;
COMMIT;
