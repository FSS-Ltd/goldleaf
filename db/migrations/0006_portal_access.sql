-- Forward-only. Subjects come exclusively from the trusted authenticated server.
BEGIN;
CREATE FUNCTION portal.list_families(p_subject text)
RETURNS TABLE (id uuid, display_name text, is_founding boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT f.id, f.display_name, EXISTS (SELECT 1 FROM portal.founding_slots AS slot WHERE slot.family_id = f.id)
    FROM portal.families AS f ORDER BY f.created_at, f.id;
END $$;

CREATE FUNCTION portal.read_family(p_subject text, p_family uuid)
RETURNS TABLE (id uuid, display_name text, is_founding boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
  SELECT f.id, f.display_name, EXISTS (SELECT 1 FROM portal.founding_slots AS slot WHERE slot.family_id = f.id)
  FROM portal.families AS f
  WHERE f.id = p_family AND EXISTS (
    SELECT 1 FROM portal.memberships AS m
    WHERE m.subject = p_subject AND m.revoked_at IS NULL AND (
      m.role = 'admin' OR (m.role = 'parent' AND m.family_id = f.id)
      OR (m.role = 'staff' AND EXISTS (
        SELECT 1 FROM portal.staff_family_assignments AS a
        WHERE a.staff_id = m.id AND a.family_id = f.id
      ))
    )
  );
$$;

CREATE FUNCTION portal.list_staff(p_subject text)
RETURNS TABLE (id uuid, subject text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT m.id, m.subject FROM portal.memberships AS m
    WHERE m.role = 'staff' AND m.revoked_at IS NULL ORDER BY m.created_at, m.id;
END $$;
CREATE FUNCTION portal.accept_verified_invitation(p_subject text, p_emails text[], p_digest bytea, p_purpose text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE matched_email text;
BEGIN
  IF p_purpose = 'parent' THEN
    SELECT i.email INTO matched_email FROM portal.invitations AS i
      WHERE i.token_digest = p_digest AND EXISTS (
        SELECT 1 FROM unnest(p_emails) AS e(email) WHERE lower(btrim(e.email)) = i.email
      );
  ELSIF p_purpose = 'staff' THEN
    SELECT i.email INTO matched_email FROM portal.staff_invitations AS i
      WHERE i.token_digest = p_digest AND EXISTS (
        SELECT 1 FROM unnest(p_emails) AS e(email) WHERE lower(btrim(e.email)) = i.email
      );
  END IF;
  IF matched_email IS NULL THEN RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '42501'; END IF;
  IF p_purpose = 'parent' THEN
    RETURN portal.accept_invitation(p_subject, matched_email, p_digest);
  END IF;
  RETURN portal.accept_staff_invitation(p_subject, matched_email, p_digest);
END $$;
REVOKE ALL ON FUNCTION portal.list_families(text), portal.read_family(text, uuid), portal.list_staff(text), portal.accept_verified_invitation(text, text[], bytea, text) FROM PUBLIC;
COMMIT;
