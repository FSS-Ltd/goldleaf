-- Forward-only. Identity comes only from the verified server boundary.
BEGIN;
-- Existing duplicate versions remain readable; all runtime writes serialize on the session row.
CREATE OR REPLACE FUNCTION portal.publish_learning_draft(p_subject text,p_session uuid,p_expected integer,p_operation uuid,p_fingerprint text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE session_row portal.sessions%ROWTYPE; draft_row portal.learning_drafts%ROWTYPE; existing portal.published_learning_updates%ROWTYPE; actor uuid; result uuid;
BEGIN
  SELECT * INTO session_row FROM portal.sessions WHERE id=p_session;
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  actor:=portal.require_family_worker(p_subject,session_row.family_id);
  IF p_operation IS NULL OR p_expected IS NULL OR p_expected<1 OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid publication' USING ERRCODE='22023'; END IF;
  -- Serialize operation IDs across different sessions as well as a session's drafts.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
  SELECT * INTO existing FROM portal.published_learning_updates WHERE operation_id=p_operation;
  IF FOUND THEN
    IF existing.session_id<>p_session OR existing.draft_version<>p_expected OR existing.published_by<>actor OR existing.preview_fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'operation already used' USING ERRCODE='23505'; END IF;
    RETURN existing.id;
  END IF;
  PERFORM 1 FROM portal.sessions WHERE id=p_session FOR UPDATE;
  SELECT * INTO existing FROM portal.published_learning_updates
    WHERE session_id=p_session AND draft_version=p_expected AND preview_fingerprint=p_fingerprint
    ORDER BY published_at,id LIMIT 1;
  IF FOUND THEN RETURN existing.id; END IF;
  IF EXISTS (SELECT 1 FROM portal.published_learning_updates WHERE session_id=p_session AND draft_version=p_expected) THEN
    RAISE EXCEPTION 'draft changed' USING ERRCODE='40001';
  END IF;
  SELECT * INTO draft_row FROM portal.learning_drafts WHERE session_id=p_session;
  IF NOT FOUND OR draft_row.version<>p_expected THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
  IF p_fingerprint<>portal.learning_fingerprint(session_row.id,session_row.child_id,session_row.family_id,draft_row.version,draft_row.body,draft_row.stage,draft_row.focus,draft_row.practice,draft_row.explored_sounds) THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
  INSERT INTO portal.published_learning_updates(operation_id,session_id,child_id,family_id,draft_version,preview_fingerprint,body,stage,focus,practice,explored_sounds,published_by)
    VALUES(p_operation,p_session,session_row.child_id,session_row.family_id,draft_row.version,p_fingerprint,draft_row.body,draft_row.stage,draft_row.focus,draft_row.practice,draft_row.explored_sounds,actor) RETURNING id INTO result;
  PERFORM pg_notify('portal_changes',json_build_object('kind','learning','id',result)::text);
  RETURN result;
END $$;

CREATE FUNCTION portal.read_scoped_session(p_subject text,p_session uuid,p_role text)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text,child_name text,family_name text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
  SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label,c.display_name,f.display_name
  FROM portal.sessions s
  JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
  JOIN portal.families f ON f.id=s.family_id
  WHERE s.id=p_session AND EXISTS (
    SELECT 1 FROM portal.memberships m
    WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL AND (
      (p_role='parent' AND m.family_id=s.family_id) OR
      (p_role='staff' AND EXISTS (SELECT 1 FROM portal.staff_family_assignments a WHERE a.staff_id=m.id AND a.family_id=s.family_id))
    )
  );
$$;
CREATE FUNCTION portal.list_staff_sessions(p_subject text)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text,child_name text,family_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label,c.display_name,f.display_name
  FROM portal.memberships m
  JOIN portal.staff_family_assignments a ON a.staff_id=m.id
  JOIN portal.sessions s ON s.family_id=a.family_id
  JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
  JOIN portal.families f ON f.id=s.family_id
  WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL
  ORDER BY s.starts_at,s.id;
END $$;
REVOKE ALL ON FUNCTION portal.read_scoped_session(text,uuid,text),portal.list_staff_sessions(text) FROM PUBLIC;
COMMIT;
