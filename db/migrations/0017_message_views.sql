-- Scoped, batched projections for the messaging UI. No direct table grants.
BEGIN;
CREATE FUNCTION portal.require_message_view_role(p_subject text,p_role text,p_family uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF p_role='admin' THEN PERFORM portal.require_admin(p_subject); RETURN; END IF;
 IF p_role='parent' THEN
  PERFORM 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.family_id=p_family AND m.revoked_at IS NULL FOR SHARE;
 ELSIF p_role='staff' THEN
  PERFORM 1 FROM portal.memberships m JOIN portal.staff_family_assignments a ON a.staff_id=m.id WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL AND a.family_id=p_family FOR SHARE OF m,a;
 ELSE RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION portal.message_view_thread(p_subject text,p_role text,p_family uuid)
RETURNS TABLE(sequence text,author_id uuid,body text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM portal.require_message_view_role(p_subject,p_role,p_family);
 RETURN QUERY SELECT * FROM portal.list_family_messages(p_subject,p_family);
END $$;
CREATE FUNCTION portal.send_message_as_role(p_subject text,p_role text,p_family uuid,p_operation uuid,p_body text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
 PERFORM 1 FROM portal.families WHERE id=p_family FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 PERFORM portal.require_message_view_role(p_subject,p_role,p_family);
 RETURN portal.send_family_message(p_subject,p_family,p_operation,p_body);
END $$;
CREATE FUNCTION portal.mark_messages_as_role(p_subject text,p_role text,p_family uuid,p_through bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM 1 FROM portal.families WHERE id=p_family FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 PERFORM portal.require_message_view_role(p_subject,p_role,p_family);
 PERFORM portal.mark_family_messages_read(p_subject,p_family,p_through);
END $$;
CREATE FUNCTION portal.message_family_summaries(p_subject text,p_role text)
RETURNS TABLE(id uuid, display_name text, unread text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF p_role NOT IN ('admin','parent','staff') OR NOT EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 SELECT f.id,f.display_name,
   (SELECT count(*)::text FROM portal.family_messages msg LEFT JOIN portal.message_read_cursors c ON c.family_id=f.id AND c.membership_id=actor.id
    WHERE msg.family_id=f.id AND NOT EXISTS (SELECT 1 FROM portal.memberships author WHERE author.id=msg.author_id AND author.subject=p_subject) AND msg.sequence>coalesce(c.through_sequence,0))
 FROM portal.families f
 CROSS JOIN LATERAL (
   SELECT m.id FROM portal.memberships m WHERE m.subject=p_subject AND m.revoked_at IS NULL AND (
     m.role='admin' OR (m.role='parent' AND m.family_id=f.id) OR (m.role='staff' AND EXISTS(SELECT 1 FROM portal.staff_family_assignments a WHERE a.staff_id=m.id AND a.family_id=f.id)))
   ORDER BY CASE m.role WHEN 'admin' THEN 0 WHEN 'parent' THEN 1 ELSE 2 END,m.id LIMIT 1
 ) actor
 WHERE EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL AND
  (p_role='admin' OR (p_role='parent' AND m.family_id=f.id) OR (p_role='staff' AND EXISTS(SELECT 1 FROM portal.staff_family_assignments a WHERE a.staff_id=m.id AND a.family_id=f.id))))
 ORDER BY f.display_name,f.id;
END $$;
CREATE FUNCTION portal.message_author_identities(p_subject text,p_role text,p_family uuid)
RETURNS TABLE(id uuid, subject text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM portal.require_message_view_role(p_subject,p_role,p_family);
 RETURN QUERY SELECT DISTINCT m.id,m.subject,m.role::text FROM portal.memberships m JOIN portal.family_messages msg ON msg.author_id=m.id WHERE msg.family_id=p_family;
END $$;
CREATE FUNCTION portal.message_sessions(p_subject text,p_role text,p_family uuid)
RETURNS TABLE(id uuid,child_name text,starts_at timestamptz,duration_minutes integer,status text,location_label text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM portal.require_message_view_role(p_subject,p_role,p_family);
 RETURN QUERY SELECT s.id,c.display_name,s.starts_at,s.duration_minutes,s.status,s.location_label FROM portal.sessions s JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id WHERE s.family_id=p_family ORDER BY s.starts_at,s.id;
END $$;
CREATE FUNCTION portal.message_request_context(p_subject text,p_role text)
RETURNS TABLE(id uuid,family_id uuid,family_name text,parent_subject text,session_id uuid,child_name text,starts_at timestamptz,duration_minutes integer,session_status text,location_label text,body text,created_at timestamptz,resolved_at timestamptz,resolution text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF p_role NOT IN ('admin','parent') OR NOT EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT r.id,r.family_id,f.display_name,parent.subject,s.id,c.display_name,s.starts_at,s.duration_minutes,s.status,s.location_label,r.body,r.created_at,r.resolved_at,r.resolution
 FROM portal.session_change_requests r JOIN portal.memberships parent ON parent.id=r.parent_id JOIN portal.families f ON f.id=r.family_id JOIN portal.sessions s ON s.id=r.session_id AND s.family_id=r.family_id JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
 WHERE EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL AND (p_role='admin' OR (m.id=r.parent_id AND m.family_id=r.family_id)))
 ORDER BY r.created_at DESC,r.id;
END $$;
CREATE FUNCTION portal.resolve_request_checked(p_subject text,p_id uuid,p_resolution text,p_new_start timestamptz,p_expected_start timestamptz,p_expected_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE request portal.session_change_requests%ROWTYPE; session_row portal.sessions%ROWTYPE;
BEGIN
 PERFORM portal.require_admin(p_subject);
 SELECT * INTO request FROM portal.session_change_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'request unavailable' USING ERRCODE='22023'; END IF;
 IF request.resolved_at IS NULL THEN
  SELECT * INTO session_row FROM portal.sessions WHERE id=request.session_id FOR UPDATE;
  IF NOT FOUND OR session_row.starts_at IS DISTINCT FROM p_expected_start OR session_row.status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'session changed' USING ERRCODE='40001'; END IF;
 END IF;
 PERFORM portal.resolve_session_change(p_subject,p_id,p_resolution,p_new_start);
END $$;
REVOKE ALL ON FUNCTION portal.message_family_summaries(text,text),portal.require_message_view_role(text,text,uuid),portal.message_view_thread(text,text,uuid),portal.send_message_as_role(text,text,uuid,uuid,text),portal.mark_messages_as_role(text,text,uuid,bigint),portal.resolve_request_checked(text,uuid,text,timestamptz,timestamptz,text),portal.message_author_identities(text,text,uuid),portal.message_sessions(text,text,uuid),portal.message_request_context(text,text) FROM PUBLIC;
COMMIT;
