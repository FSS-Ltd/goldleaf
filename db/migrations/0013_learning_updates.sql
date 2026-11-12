-- Forward-only. Private notes, editable drafts and published updates have separate storage.
BEGIN;
CREATE TABLE portal.session_private_notes (
  session_id uuid PRIMARY KEY REFERENCES portal.sessions(id),
  body text NOT NULL CHECK (length(body)<=10000),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid NOT NULL REFERENCES portal.memberships(id)
);
CREATE TABLE portal.learning_drafts (
  session_id uuid PRIMARY KEY REFERENCES portal.sessions(id),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 10000),
  stage smallint CHECK (stage BETWEEN 0 AND 4),
  focus text CHECK (length(focus)<=1000),
  practice text CHECK (length(practice)<=1000),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid NOT NULL REFERENCES portal.memberships(id)
);
CREATE TABLE portal.published_learning_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL,
  child_id uuid NOT NULL,
  family_id uuid NOT NULL,
  draft_version integer NOT NULL,
  preview_fingerprint text NOT NULL CHECK (preview_fingerprint ~ '^[0-9a-f]{64}$'),
  body text NOT NULL,
  stage smallint CHECK (stage BETWEEN 0 AND 4),
  focus text,
  practice text,
  published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_by uuid NOT NULL REFERENCES portal.memberships(id),
  FOREIGN KEY (session_id,child_id,family_id) REFERENCES portal.sessions(id,child_id,family_id)
);
CREATE INDEX published_learning_family_child ON portal.published_learning_updates(family_id,child_id,published_at,id);
REVOKE ALL ON portal.session_private_notes,portal.learning_drafts,portal.published_learning_updates FROM PUBLIC;

CREATE FUNCTION portal.learning_workspace(p_subject text,p_session uuid)
RETURNS TABLE(note text,note_version integer,draft text,draft_version integer,stage smallint,focus text,practice text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE family uuid;
BEGIN
  SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_session;
  IF family IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  PERFORM portal.require_family_worker(p_subject,family);
  RETURN QUERY SELECT n.body,COALESCE(n.version,0),d.body,COALESCE(d.version,0),d.stage,d.focus,d.practice
    FROM (SELECT 1) AS seed LEFT JOIN portal.session_private_notes n ON n.session_id=p_session
    LEFT JOIN portal.learning_drafts d ON d.session_id=p_session;
END $$;
CREATE FUNCTION portal.save_private_note(p_subject text,p_session uuid,p_body text,p_expected integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE family uuid; actor uuid; current_version integer; result integer;
BEGIN
  SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_session;
  IF family IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  actor:=portal.require_family_worker(p_subject,family);
  IF p_body IS NULL OR length(p_body)>10000 OR p_expected IS NULL OR p_expected<0 THEN RAISE EXCEPTION 'invalid note' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM portal.sessions WHERE id=p_session FOR UPDATE;
  SELECT version INTO current_version FROM portal.session_private_notes WHERE session_id=p_session;
  IF COALESCE(current_version,0)<>p_expected THEN RAISE EXCEPTION 'note changed' USING ERRCODE='40001'; END IF;
  INSERT INTO portal.session_private_notes(session_id,body,updated_by) VALUES(p_session,p_body,actor)
    ON CONFLICT(session_id) DO UPDATE SET body=EXCLUDED.body,version=portal.session_private_notes.version+1,updated_at=clock_timestamp(),updated_by=EXCLUDED.updated_by RETURNING version INTO result;
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_session)::text);
  RETURN result;
END $$;
CREATE FUNCTION portal.save_learning_draft(p_subject text,p_session uuid,p_body text,p_stage smallint,p_focus text,p_practice text,p_expected integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE family uuid; actor uuid; current_version integer; result integer;
BEGIN
  SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_session;
  IF family IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  actor:=portal.require_family_worker(p_subject,family);
  IF p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 10000 OR (p_stage IS NOT NULL AND p_stage NOT BETWEEN 0 AND 4) OR length(p_focus)>1000 OR length(p_practice)>1000 OR p_expected IS NULL OR p_expected<0 THEN RAISE EXCEPTION 'invalid draft' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM portal.sessions WHERE id=p_session FOR UPDATE;
  SELECT version INTO current_version FROM portal.learning_drafts WHERE session_id=p_session;
  IF COALESCE(current_version,0)<>p_expected THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
  INSERT INTO portal.learning_drafts(session_id,body,stage,focus,practice,updated_by) VALUES(p_session,p_body,p_stage,p_focus,p_practice,actor)
    ON CONFLICT(session_id) DO UPDATE SET body=EXCLUDED.body,stage=EXCLUDED.stage,focus=EXCLUDED.focus,practice=EXCLUDED.practice,version=portal.learning_drafts.version+1,updated_at=clock_timestamp(),updated_by=EXCLUDED.updated_by RETURNING version INTO result;
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_session)::text);
  RETURN result;
END $$;
-- This fingerprint is an optimistic comparison, never an authorization token.
CREATE FUNCTION portal.learning_fingerprint(p_session uuid,p_child uuid,p_family uuid,p_version integer,p_body text,p_stage smallint,p_focus text,p_practice text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, pg_temp AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(p_session,p_child,p_family,p_version,p_body,p_stage,p_focus,p_practice)::text,'UTF8')),'hex')
$$;
CREATE FUNCTION portal.preview_learning_draft(p_subject text,p_session uuid,p_expected integer)
RETURNS TABLE(body text,stage smallint,focus text,practice text,version integer,fingerprint text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE family uuid;
BEGIN
  SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_session;
  IF family IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  PERFORM portal.require_family_worker(p_subject,family);
  RETURN QUERY SELECT d.body,d.stage,d.focus,d.practice,d.version,portal.learning_fingerprint(s.id,s.child_id,s.family_id,d.version,d.body,d.stage,d.focus,d.practice)
    FROM portal.learning_drafts d JOIN portal.sessions s ON s.id=d.session_id WHERE d.session_id=p_session AND d.version=p_expected;
  IF NOT FOUND THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
END $$;
CREATE FUNCTION portal.publish_learning_draft(p_subject text,p_session uuid,p_expected integer,p_operation uuid,p_fingerprint text) RETURNS uuid
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
  SELECT * INTO draft_row FROM portal.learning_drafts WHERE session_id=p_session;
  IF NOT FOUND OR draft_row.version<>p_expected THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
  IF p_fingerprint<>portal.learning_fingerprint(session_row.id,session_row.child_id,session_row.family_id,draft_row.version,draft_row.body,draft_row.stage,draft_row.focus,draft_row.practice) THEN RAISE EXCEPTION 'draft changed' USING ERRCODE='40001'; END IF;
  INSERT INTO portal.published_learning_updates(operation_id,session_id,child_id,family_id,draft_version,preview_fingerprint,body,stage,focus,practice,published_by)
    VALUES(p_operation,p_session,session_row.child_id,session_row.family_id,draft_row.version,p_fingerprint,draft_row.body,draft_row.stage,draft_row.focus,draft_row.practice,actor) RETURNING id INTO result;
  PERFORM pg_notify('portal_changes',json_build_object('kind','learning','id',result)::text);
  RETURN result;
END $$;
CREATE FUNCTION portal.list_published_learning(p_subject text,p_family uuid,p_child uuid)
RETURNS TABLE(id uuid,session_id uuid,child_id uuid,family_id uuid,body text,stage smallint,focus text,practice text,published_at timestamptz,published_by uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.read_family(p_subject,p_family)) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT u.id,u.session_id,u.child_id,u.family_id,u.body,u.stage,u.focus,u.practice,u.published_at,u.published_by
    FROM portal.published_learning_updates u WHERE u.family_id=p_family AND u.child_id=p_child ORDER BY u.published_at DESC,u.id DESC;
END $$;
REVOKE ALL ON FUNCTION portal.learning_fingerprint(uuid,uuid,uuid,integer,text,smallint,text,text),portal.learning_workspace(text,uuid),portal.save_private_note(text,uuid,text,integer),portal.save_learning_draft(text,uuid,text,smallint,text,text,integer),portal.preview_learning_draft(text,uuid,integer),portal.publish_learning_draft(text,uuid,integer,uuid,text),portal.list_published_learning(text,uuid,uuid) FROM PUBLIC;
COMMIT;
