-- Forward-only. Invitation delivery status contains no token or provider response.
BEGIN;
ALTER TABLE portal.invitations ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'sent', 'failed'));
ALTER TABLE portal.invitations ADD COLUMN delivery_request_id uuid UNIQUE;

CREATE FUNCTION portal.issue_parent_delivery(p_subject text, p_family uuid, p_email text, p_digest bytea, p_expires timestamptz, p_request uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE result uuid;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_request IS NULL THEN RAISE EXCEPTION 'invalid request' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM portal.families WHERE id = p_family FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM portal.invitations WHERE delivery_request_id = p_request) THEN
    RAISE EXCEPTION 'request already used' USING ERRCODE = '23505';
  END IF;
  result := portal.issue_invitation(p_subject, p_family, p_email, p_digest, p_expires);
  UPDATE portal.invitations SET delivery_request_id = p_request WHERE id = result;
  RETURN result;
END $$;

CREATE FUNCTION portal.list_family_invitations(p_subject text, p_family uuid)
RETURNS TABLE (id uuid, email text, delivery_status text, active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.id, i.email, i.delivery_status,
    (i.revoked_at IS NULL AND i.consumed_at IS NULL AND i.expires_at > clock_timestamp())
    FROM portal.invitations AS i WHERE i.family_id = p_family ORDER BY i.created_at DESC, i.id;
END $$;

CREATE FUNCTION portal.invitation_delivery_recipient(p_subject text, p_invitation uuid, p_digest bytea)
RETURNS TABLE (email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.email FROM portal.invitations AS i
    WHERE i.id = p_invitation AND i.token_digest = p_digest AND i.delivery_status = 'pending'
      AND i.revoked_at IS NULL AND i.consumed_at IS NULL AND i.expires_at > clock_timestamp();
END $$;

CREATE FUNCTION portal.mark_invitation_delivery(p_subject text, p_invitation uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_status NOT IN ('sent', 'failed') OR p_status IS NULL THEN
    RAISE EXCEPTION 'invalid delivery status' USING ERRCODE = '22023';
  END IF;
  UPDATE portal.invitations SET delivery_status = p_status
    WHERE id = p_invitation AND delivery_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'invitation delivery unavailable' USING ERRCODE = '22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION portal.issue_parent_delivery(text, uuid, text, bytea, timestamptz, uuid), portal.list_family_invitations(text, uuid), portal.mark_invitation_delivery(text, uuid, text), portal.invitation_delivery_recipient(text, uuid, bytea) FROM PUBLIC;
COMMIT;
