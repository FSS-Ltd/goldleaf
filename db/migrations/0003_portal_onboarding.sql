-- Forward-only. Functions are callable only by an explicitly provisioned trusted server role.
BEGIN;
ALTER TABLE portal.families
  ADD COLUMN display_name text CHECK (display_name IS NULL OR (length(btrim(display_name)) BETWEEN 1 AND 120)),
  ADD COLUMN invitation_version bigint NOT NULL DEFAULT 0 CHECK (invitation_version >= 0);
CREATE TABLE portal.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL CHECK (subject <> ''),
  role text NOT NULL CHECK (role IN ('admin', 'parent', 'staff')),
  family_id uuid REFERENCES portal.families(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES portal.memberships(id),
  revoked_invitation_version bigint NOT NULL DEFAULT 0 CHECK (revoked_invitation_version >= 0),
  CHECK ((role = 'parent') = (family_id IS NOT NULL)),
  UNIQUE NULLS NOT DISTINCT (subject, role, family_id)
);
CREATE TABLE portal.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES portal.families(id),
  issued_version bigint NOT NULL CHECK (issued_version > 0),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email <> ''),
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest) = 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES portal.memberships(id),
  CHECK (expires_at > created_at),
  UNIQUE (family_id, issued_version)
);
CREATE INDEX invitations_family_email ON portal.invitations (family_id, email) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE TABLE portal.founding_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES portal.families(id),
  slot smallint NOT NULL REFERENCES portal.founding_slots(slot),
  is_founding boolean NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid NOT NULL REFERENCES portal.memberships(id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA portal FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA portal FROM PUBLIC;

CREATE FUNCTION portal.require_admin(p_subject text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid;
BEGIN
  SELECT id INTO actor FROM portal.memberships
  WHERE subject = p_subject AND role = 'admin' AND revoked_at IS NULL FOR SHARE;
  IF actor IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501'; END IF;
  RETURN actor;
END $$;
CREATE FUNCTION portal.create_family(p_subject text, p_display_name text DEFAULT NULL, p_family uuid DEFAULT gen_random_uuid()) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE result uuid;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_display_name IS NULL OR btrim(p_display_name) = '' THEN
    RAISE EXCEPTION 'family name required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO portal.families (id, display_name) VALUES (p_family, btrim(p_display_name)) RETURNING id INTO result;
  RETURN result;
END $$;
CREATE FUNCTION portal.active_memberships(p_subject text)
RETURNS TABLE (role text, family_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
  SELECT m.role, m.family_id FROM portal.memberships AS m
  WHERE m.subject = p_subject AND m.revoked_at IS NULL;
$$;
CREATE FUNCTION portal.family_memberships(p_subject text, p_family uuid)
RETURNS TABLE (id uuid, subject text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT m.id, m.subject, m.role FROM portal.memberships AS m
    WHERE m.family_id = p_family AND m.revoked_at IS NULL;
END $$;
CREATE FUNCTION portal.revoke_membership(p_subject text, p_membership uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; target_family uuid; family_version bigint;
BEGIN
  actor := portal.require_admin(p_subject);
  SELECT family_id INTO target_family FROM portal.memberships WHERE id = p_membership AND role = 'parent';
  IF target_family IS NOT NULL THEN
    SELECT invitation_version INTO family_version FROM portal.families WHERE id = target_family FOR UPDATE;
  END IF;
  UPDATE portal.memberships SET revoked_at = clock_timestamp(), revoked_by = actor,
    revoked_invitation_version = COALESCE(family_version, revoked_invitation_version)
    WHERE id = p_membership AND role IN ('parent', 'staff') AND revoked_at IS NULL;
END $$;
CREATE FUNCTION portal.issue_invitation(p_subject text, p_family uuid, p_email text, p_digest bytea, p_expires timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; result uuid; issued_version bigint; canonical text := lower(btrim(p_email));
BEGIN
  actor := portal.require_admin(p_subject);
  IF canonical IS NULL OR canonical = '' OR p_digest IS NULL OR octet_length(p_digest) <> 32 OR p_expires IS NULL OR p_expires <= clock_timestamp() THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '22023';
  END IF;
  UPDATE portal.families SET invitation_version = invitation_version + 1
    WHERE id = p_family RETURNING invitation_version INTO issued_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE = '22023'; END IF;
  UPDATE portal.invitations SET revoked_at = clock_timestamp(), revoked_by = actor
    WHERE family_id = p_family AND email = canonical AND consumed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO portal.invitations (family_id, issued_version, email, token_digest, expires_at, created_by)
    VALUES (p_family, issued_version, canonical, p_digest, p_expires, actor) RETURNING id INTO result;
  RETURN result;
END $$;
CREATE FUNCTION portal.revoke_invitation(p_subject text, p_invitation uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  UPDATE portal.invitations SET revoked_at = clock_timestamp(), revoked_by = actor
    WHERE id = p_invitation AND consumed_at IS NULL AND revoked_at IS NULL;
END $$;
CREATE FUNCTION portal.accept_invitation(p_subject text, p_verified_email text, p_digest bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE invitation portal.invitations%ROWTYPE; result uuid; existing portal.memberships%ROWTYPE;
BEGIN
  IF p_subject IS NULL OR p_subject = '' OR p_verified_email IS NULL OR p_digest IS NULL THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO invitation FROM portal.invitations WHERE token_digest = p_digest;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501'; END IF;
  -- Match issue_invitation's family-then-invitation lock order.
  PERFORM 1 FROM portal.families WHERE id = invitation.family_id FOR UPDATE;
  SELECT * INTO invitation FROM portal.invitations WHERE token_digest = p_digest FOR UPDATE;
  IF NOT FOUND OR invitation.email <> lower(btrim(p_verified_email)) OR invitation.revoked_at IS NOT NULL
     OR invitation.consumed_at IS NOT NULL OR invitation.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO existing FROM portal.memberships WHERE subject = p_subject AND role = 'parent' AND family_id = invitation.family_id FOR UPDATE;
  IF FOUND AND invitation.issued_version <= existing.revoked_invitation_version THEN
    RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501';
  END IF;
  INSERT INTO portal.memberships (subject, role, family_id) VALUES (p_subject, 'parent', invitation.family_id)
    ON CONFLICT (subject, role, family_id) DO UPDATE SET revoked_at = NULL, revoked_by = NULL RETURNING id INTO result;
  UPDATE portal.invitations SET consumed_at = clock_timestamp() WHERE id = invitation.id;
  RETURN result;
END $$;
CREATE FUNCTION portal.set_founding(p_subject text, p_family uuid, p_enabled boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; selected_slot smallint;
BEGIN
  actor := portal.require_admin(p_subject);
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'invalid state' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM portal.families WHERE id = p_family FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE = '22023'; END IF;
  SELECT slot INTO selected_slot FROM portal.founding_slots WHERE family_id = p_family;
  IF p_enabled AND selected_slot IS NULL THEN
    SELECT slot INTO selected_slot FROM portal.founding_slots WHERE family_id IS NULL ORDER BY slot LIMIT 1 FOR UPDATE;
    IF selected_slot IS NULL THEN RAISE EXCEPTION 'founding capacity reached' USING ERRCODE = 'P0001'; END IF;
    UPDATE portal.founding_slots SET family_id = p_family WHERE slot = selected_slot AND family_id IS NULL;
    INSERT INTO portal.founding_history (family_id, slot, is_founding, changed_by) VALUES (p_family, selected_slot, true, actor);
  ELSIF NOT p_enabled AND selected_slot IS NOT NULL THEN
    UPDATE portal.founding_slots SET family_id = NULL WHERE slot = selected_slot AND family_id = p_family;
    INSERT INTO portal.founding_history (family_id, slot, is_founding, changed_by) VALUES (p_family, selected_slot, false, actor);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA portal FROM PUBLIC;
COMMIT;
