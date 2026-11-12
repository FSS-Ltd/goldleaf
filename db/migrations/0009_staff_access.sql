-- Forward-only. Subjects come exclusively from the trusted authenticated server.
BEGIN;
CREATE FUNCTION portal.list_pending_staff_invitations(p_subject text)
RETURNS TABLE (id uuid, email text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.id, i.email, i.expires_at FROM portal.staff_invitations AS i
    WHERE i.consumed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > clock_timestamp()
    ORDER BY i.created_at, i.id;
END $$;
CREATE FUNCTION portal.list_staff_family_assignments(p_subject text, p_staff uuid)
RETURNS TABLE (id uuid, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  PERFORM 1 FROM portal.memberships AS m WHERE m.id = p_staff AND m.role = 'staff' AND m.revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff not found' USING ERRCODE = '22023'; END IF;
  RETURN QUERY SELECT f.id, f.display_name FROM portal.staff_family_assignments AS a
    JOIN portal.families AS f ON f.id = a.family_id WHERE a.staff_id = p_staff
    ORDER BY f.created_at, f.id;
END $$;
CREATE FUNCTION portal.list_assigned_staff_families(p_subject text)
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
  SELECT f.id, f.display_name FROM portal.memberships AS m
    JOIN portal.staff_family_assignments AS a ON a.staff_id = m.id
    JOIN portal.families AS f ON f.id = a.family_id
    WHERE m.subject = p_subject AND m.role = 'staff' AND m.revoked_at IS NULL
    ORDER BY f.created_at, f.id;
$$;
REVOKE ALL ON FUNCTION portal.list_pending_staff_invitations(text), portal.list_staff_family_assignments(text,uuid), portal.list_assigned_staff_families(text) FROM PUBLIC;
COMMIT;
