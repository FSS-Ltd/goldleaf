-- Forward-only. Identity arguments must come from the trusted server boundary.
BEGIN;
CREATE TABLE portal.staff_invitation_order (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0)
);
INSERT INTO portal.staff_invitation_order DEFAULT VALUES;
CREATE TABLE portal.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_version bigint NOT NULL UNIQUE CHECK (issued_version > 0),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest) = 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES portal.memberships(id),
  CHECK (expires_at > created_at)
);
CREATE INDEX staff_invitations_email ON portal.staff_invitations(email) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE TABLE portal.staff_family_assignments (
  staff_id uuid NOT NULL REFERENCES portal.memberships(id),
  family_id uuid NOT NULL REFERENCES portal.families(id),
  PRIMARY KEY (staff_id, family_id)
);
CREATE TABLE portal.staff_assignment_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES portal.memberships(id),
  family_id uuid NOT NULL REFERENCES portal.families(id),
  enabled boolean NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid NOT NULL REFERENCES portal.memberships(id)
);
REVOKE ALL ON portal.staff_invitation_order, portal.staff_invitations, portal.staff_family_assignments, portal.staff_assignment_history FROM PUBLIC;
REVOKE ALL ON SEQUENCE portal.staff_assignment_history_id_seq FROM PUBLIC;

-- Keep one unique registry across both invitation purposes, including concurrent issuers.
CREATE TABLE portal.invitation_digests (digest bytea PRIMARY KEY CHECK (octet_length(digest) = 32));
INSERT INTO portal.invitation_digests(digest) SELECT token_digest FROM portal.invitations;
REVOKE ALL ON portal.invitation_digests FROM PUBLIC;
CREATE FUNCTION portal.register_invitation_digest() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'invitation digest is immutable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO portal.invitation_digests(digest) VALUES (NEW.token_digest);
  RETURN NEW;
END $$;
CREATE TRIGGER staff_invitation_digest BEFORE INSERT OR UPDATE OF token_digest ON portal.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION portal.register_invitation_digest();
CREATE TRIGGER parent_invitation_digest BEFORE INSERT OR UPDATE OF token_digest ON portal.invitations
  FOR EACH ROW EXECUTE FUNCTION portal.register_invitation_digest();

CREATE FUNCTION portal.issue_staff_invitation(p_subject text, p_email text, p_digest bytea, p_expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; result uuid; issued bigint; canonical text := lower(btrim(p_email));
BEGIN
  actor := portal.require_admin(p_subject);
  IF canonical IS NULL OR canonical = '' OR p_digest IS NULL OR octet_length(p_digest) <> 32 OR p_expires IS NULL OR p_expires <= clock_timestamp() THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '22023';
  END IF;
  UPDATE portal.staff_invitation_order SET version = version + 1 RETURNING version INTO issued;
  UPDATE portal.staff_invitations SET revoked_at = clock_timestamp(), revoked_by = actor
    WHERE email = canonical AND consumed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO portal.staff_invitations(issued_version, email, token_digest, expires_at, created_by)
    VALUES (issued, canonical, p_digest, p_expires, actor) RETURNING id INTO result;
  RETURN result;
END $$;
CREATE FUNCTION portal.revoke_staff_invitation(p_subject text, p_invitation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  PERFORM 1 FROM portal.staff_invitation_order FOR UPDATE;
  UPDATE portal.staff_invitations SET revoked_at = clock_timestamp(), revoked_by = actor
    WHERE id = p_invitation AND consumed_at IS NULL AND revoked_at IS NULL;
END $$;
CREATE FUNCTION portal.accept_staff_invitation(p_subject text, p_verified_email text, p_digest bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE invitation portal.staff_invitations%ROWTYPE; existing portal.memberships%ROWTYPE; result uuid;
BEGIN
  IF p_subject IS NULL OR p_subject = '' OR p_verified_email IS NULL OR p_digest IS NULL THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM portal.staff_invitation_order FOR UPDATE;
  SELECT * INTO invitation FROM portal.staff_invitations WHERE token_digest = p_digest FOR UPDATE;
  IF NOT FOUND OR invitation.email <> lower(btrim(p_verified_email)) OR invitation.revoked_at IS NOT NULL
     OR invitation.consumed_at IS NOT NULL OR invitation.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO existing FROM portal.memberships WHERE subject = p_subject AND role = 'staff' FOR UPDATE;
  IF FOUND AND invitation.issued_version <= existing.revoked_invitation_version THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  INSERT INTO portal.memberships(subject, role) VALUES (p_subject, 'staff')
    ON CONFLICT (subject, role, family_id) DO UPDATE SET revoked_at = NULL, revoked_by = NULL RETURNING id INTO result;
  UPDATE portal.staff_invitations SET consumed_at = clock_timestamp() WHERE id = invitation.id;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION portal.revoke_membership(p_subject text, p_membership uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; target_family uuid; target_role text; barrier bigint;
BEGIN
  actor := portal.require_admin(p_subject);
  SELECT role, family_id INTO target_role, target_family FROM portal.memberships WHERE id = p_membership AND role IN ('parent', 'staff');
  IF target_role = 'parent' THEN
    SELECT invitation_version INTO barrier FROM portal.families WHERE id = target_family FOR UPDATE;
  ELSIF target_role = 'staff' THEN
    SELECT version INTO barrier FROM portal.staff_invitation_order FOR UPDATE;
  END IF;
  UPDATE portal.memberships SET revoked_at = clock_timestamp(), revoked_by = actor,
    revoked_invitation_version = COALESCE(barrier, revoked_invitation_version)
    WHERE id = p_membership AND role IN ('parent', 'staff') AND revoked_at IS NULL;
  IF FOUND AND target_role = 'staff' THEN
    WITH removed AS (DELETE FROM portal.staff_family_assignments WHERE staff_id = p_membership RETURNING staff_id, family_id)
    INSERT INTO portal.staff_assignment_history(staff_id, family_id, enabled, changed_by)
      SELECT staff_id, family_id, false, actor FROM removed;
  END IF;
END $$;
CREATE FUNCTION portal.set_staff_family_access(p_subject text, p_staff uuid, p_family uuid, p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; changed boolean;
BEGIN
  actor := portal.require_admin(p_subject);
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'invalid state' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM portal.memberships WHERE id = p_staff AND role = 'staff' AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff not found' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM portal.families WHERE id = p_family;
  IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE = '22023'; END IF;
  IF p_enabled THEN
    INSERT INTO portal.staff_family_assignments(staff_id, family_id) VALUES (p_staff, p_family) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM portal.staff_family_assignments WHERE staff_id = p_staff AND family_id = p_family;
  END IF;
  changed := FOUND;
  IF changed THEN INSERT INTO portal.staff_assignment_history(staff_id, family_id, enabled, changed_by) VALUES (p_staff, p_family, p_enabled, actor); END IF;
END $$;
CREATE FUNCTION portal.assigned_family_ids(p_subject text) RETURNS TABLE (family_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
  SELECT a.family_id FROM portal.staff_family_assignments AS a
  JOIN portal.memberships AS m ON m.id = a.staff_id
  WHERE m.subject = p_subject AND m.role = 'staff' AND m.revoked_at IS NULL;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA portal FROM PUBLIC;
COMMIT;
