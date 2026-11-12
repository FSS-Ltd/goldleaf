-- Forward-only. Identity comes only from the verified server boundary.
BEGIN;
-- Block in-flight INSERT statements before backfilling, then install the trigger
-- before releasing the lock. Older invocations that have not inserted yet use it too.
LOCK TABLE portal.published_learning_updates IN SHARE ROW EXCLUSIVE MODE;
-- Bind every acknowledged request, including aliases of an existing publication.
CREATE TABLE portal.learning_publication_operations (
  operation_id uuid PRIMARY KEY,
  publication_id uuid NOT NULL REFERENCES portal.published_learning_updates(id) DEFERRABLE INITIALLY DEFERRED,
  session_id uuid NOT NULL REFERENCES portal.sessions(id),
  draft_version integer NOT NULL CHECK (draft_version > 0),
  preview_fingerprint text NOT NULL CHECK (preview_fingerprint ~ '^[0-9a-f]{64}$'),
  actor_id uuid NOT NULL REFERENCES portal.memberships(id)
);
INSERT INTO portal.learning_publication_operations(operation_id,publication_id,session_id,draft_version,preview_fingerprint,actor_id)
SELECT operation_id,id,session_id,draft_version,preview_fingerprint,published_by FROM portal.published_learning_updates;
REVOKE ALL ON portal.learning_publication_operations FROM PUBLIC;
CREATE FUNCTION portal.bind_learning_publication_operation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
  INSERT INTO portal.learning_publication_operations(operation_id,publication_id,session_id,draft_version,preview_fingerprint,actor_id)
    VALUES(NEW.operation_id,NEW.id,NEW.session_id,NEW.draft_version,NEW.preview_fingerprint,NEW.published_by)
    ON CONFLICT(operation_id) DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'operation already used' USING ERRCODE='23505'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER learning_publication_operation_binding BEFORE INSERT ON portal.published_learning_updates
  FOR EACH ROW EXECUTE FUNCTION portal.bind_learning_publication_operation();
REVOKE ALL ON FUNCTION portal.bind_learning_publication_operation() FROM PUBLIC;


-- Existing duplicate versions remain readable; all runtime writes serialize on the session row.
CREATE OR REPLACE FUNCTION portal.publish_learning_draft(p_subject text,p_session uuid,p_expected integer,p_operation uuid,p_fingerprint text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE session_row portal.sessions%ROWTYPE; draft_row portal.learning_drafts%ROWTYPE; existing portal.published_learning_updates%ROWTYPE; operation_row portal.learning_publication_operations%ROWTYPE; actor uuid; result uuid;
BEGIN
  SELECT * INTO session_row FROM portal.sessions WHERE id=p_session;
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  actor:=portal.require_family_worker(p_subject,session_row.family_id);
  IF p_operation IS NULL OR p_expected IS NULL OR p_expected<1 OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid publication' USING ERRCODE='22023'; END IF;
  -- Serialize operation IDs across different sessions as well as a session's drafts.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
  SELECT * INTO operation_row FROM portal.learning_publication_operations WHERE operation_id=p_operation;
  IF FOUND THEN
    IF operation_row.session_id<>p_session OR operation_row.draft_version<>p_expected OR operation_row.actor_id<>actor OR operation_row.preview_fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'operation already used' USING ERRCODE='23505'; END IF;
    RETURN operation_row.publication_id;
  END IF;
  PERFORM 1 FROM portal.sessions WHERE id=p_session FOR UPDATE;
  SELECT * INTO existing FROM portal.published_learning_updates
    WHERE session_id=p_session AND draft_version=p_expected AND preview_fingerprint=p_fingerprint
    ORDER BY published_at,id LIMIT 1;
  IF FOUND THEN
    INSERT INTO portal.learning_publication_operations(operation_id,publication_id,session_id,draft_version,preview_fingerprint,actor_id)
      VALUES(p_operation,existing.id,p_session,p_expected,p_fingerprint,actor);
    RETURN existing.id;
  END IF;
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
      (p_role='admin' AND m.family_id IS NULL) OR
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
CREATE FUNCTION portal.list_parent_latest_learning(p_subject text)
RETURNS TABLE(id uuid,session_id uuid,child_id uuid,family_id uuid,body text,stage smallint,focus text,practice text,explored_sounds text[],published_at timestamptz,published_by uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT DISTINCT ON (u.child_id) u.id,u.session_id,u.child_id,u.family_id,u.body,u.stage,u.focus,u.practice,u.explored_sounds,u.published_at,u.published_by
    FROM portal.published_learning_updates u
    WHERE EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL AND m.family_id=u.family_id)
    ORDER BY u.child_id,u.published_at DESC,u.id DESC;
END $$;
REVOKE ALL ON FUNCTION portal.read_scoped_session(text,uuid,text),portal.list_staff_sessions(text),portal.list_parent_latest_learning(text) FROM PUBLIC;
COMMIT;
