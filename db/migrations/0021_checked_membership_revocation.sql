-- Forward-only: install before deploying the checked membership-removal UI.
BEGIN;
ALTER TABLE portal.memberships ADD COLUMN access_generation bigint NOT NULL DEFAULT 0 CHECK (access_generation >= 0);

CREATE FUNCTION portal.advance_membership_generation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF (OLD.revoked_at IS NULL) IS DISTINCT FROM (NEW.revoked_at IS NULL) THEN
    NEW.access_generation := OLD.access_generation + 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER portal_membership_generation BEFORE UPDATE OF revoked_at ON portal.memberships
  FOR EACH ROW EXECUTE FUNCTION portal.advance_membership_generation();

CREATE FUNCTION portal.list_removable_memberships(p_subject text, p_role text, p_family uuid)
RETURNS TABLE (id uuid, subject text, role text, generation text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_role IS NULL OR NOT ((p_role = 'parent' AND p_family IS NOT NULL) OR (p_role = 'staff' AND p_family IS NULL)) THEN
    RAISE EXCEPTION 'invalid target scope' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT m.id, m.subject, m.role, m.access_generation::text
    FROM portal.memberships m WHERE m.role = p_role AND m.family_id IS NOT DISTINCT FROM p_family AND m.revoked_at IS NULL
    ORDER BY m.created_at, m.id;
END $$;

CREATE FUNCTION portal.revoke_membership_checked(p_subject text, p_membership uuid, p_role text, p_family uuid, p_generation bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE target portal.memberships%ROWTYPE;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_membership IS NULL OR p_role IS NULL OR p_generation IS NULL OR p_generation < 0 OR
    NOT ((p_role = 'parent' AND p_family IS NOT NULL) OR (p_role = 'staff' AND p_family IS NULL)) THEN
    RAISE EXCEPTION 'invalid target scope' USING ERRCODE = '22023';
  END IF;
  -- Match invitation acceptance and canonical revocation lock order.
  IF p_role = 'parent' THEN
    PERFORM 1 FROM portal.families WHERE id = p_family FOR UPDATE;
  ELSE
    PERFORM 1 FROM portal.staff_invitation_order FOR UPDATE;
  END IF;
  SELECT * INTO target FROM portal.memberships m WHERE m.id = p_membership FOR UPDATE;
  IF NOT FOUND OR target.role <> p_role OR target.family_id IS DISTINCT FROM p_family OR
    target.revoked_at IS NOT NULL OR target.access_generation <> p_generation THEN
    RETURN false;
  END IF;
  PERFORM portal.revoke_membership(p_subject, p_membership);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION portal.advance_membership_generation(), portal.list_removable_memberships(text,text,uuid), portal.revoke_membership_checked(text,uuid,text,uuid,bigint) FROM PUBLIC;
COMMIT;
