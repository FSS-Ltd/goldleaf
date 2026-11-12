-- Forward-only. Staff invitation delivery stores no bearer token or provider response.
BEGIN;
ALTER TABLE portal.staff_invitations ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'sent', 'failed'));
ALTER TABLE portal.staff_invitations ADD COLUMN delivery_request_id uuid UNIQUE;

CREATE FUNCTION portal.issue_staff_delivery(p_subject text, p_email text, p_digest bytea, p_expires timestamptz, p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE result uuid;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_request IS NULL THEN RAISE EXCEPTION 'invalid request' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM portal.staff_invitation_order FOR UPDATE;
  IF EXISTS (SELECT 1 FROM portal.staff_invitations WHERE delivery_request_id = p_request) THEN
    RAISE EXCEPTION 'request already used' USING ERRCODE = '23505';
  END IF;
  result := portal.issue_staff_invitation(p_subject, p_email, p_digest, p_expires);
  UPDATE portal.staff_invitations SET delivery_request_id = p_request WHERE id = result;
  RETURN result;
END $$;

CREATE FUNCTION portal.list_staff_deliveries(p_subject text)
RETURNS TABLE (id uuid, email text, delivery_status text, active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.id, i.email, i.delivery_status,
    (i.revoked_at IS NULL AND i.consumed_at IS NULL AND i.expires_at > clock_timestamp())
    FROM portal.staff_invitations AS i ORDER BY i.created_at DESC, i.id;
END $$;

CREATE FUNCTION portal.staff_delivery_recipient(p_subject text, p_invitation uuid, p_digest bytea)
RETURNS TABLE (email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.email FROM portal.staff_invitations AS i
    WHERE i.id = p_invitation AND i.token_digest = p_digest AND i.delivery_status = 'pending'
      AND i.revoked_at IS NULL AND i.consumed_at IS NULL AND i.expires_at > clock_timestamp();
END $$;

CREATE FUNCTION portal.mark_staff_delivery(p_subject text, p_invitation uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_status IS NULL OR p_status NOT IN ('sent', 'failed') THEN RAISE EXCEPTION 'invalid delivery status' USING ERRCODE = '22023'; END IF;
  UPDATE portal.staff_invitations SET delivery_status = p_status WHERE id = p_invitation AND delivery_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation delivery unavailable' USING ERRCODE = '22023'; END IF;
END $$;

CREATE FUNCTION portal.set_staff_assignments(p_subject text, p_staff uuid, p_families uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE family uuid;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_families IS NULL OR cardinality(p_families) > 500 OR array_position(p_families, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'invalid assignments' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM portal.memberships WHERE id = p_staff AND role = 'staff' AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff not found' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_families) AS requested(id) WHERE NOT EXISTS (SELECT 1 FROM portal.families f WHERE f.id = requested.id)) THEN
    RAISE EXCEPTION 'family not found' USING ERRCODE = '22023';
  END IF;
  FOR family IN SELECT family_id FROM portal.staff_family_assignments WHERE staff_id = p_staff AND NOT (family_id = ANY(p_families)) LOOP
    PERFORM portal.set_staff_family_access(p_subject, p_staff, family, false);
  END LOOP;
  FOR family IN SELECT DISTINCT unnest(p_families) LOOP
    PERFORM portal.set_staff_family_access(p_subject, p_staff, family, true);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION portal.issue_staff_delivery(text,text,bytea,timestamptz,uuid), portal.list_staff_deliveries(text), portal.staff_delivery_recipient(text,uuid,bytea), portal.mark_staff_delivery(text,uuid,text), portal.set_staff_assignments(text,uuid,uuid[]) FROM PUBLIC;
COMMIT;
