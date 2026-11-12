-- Forward-only. Caller identity is supplied only by the verified server boundary.
BEGIN;
CREATE TABLE portal.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES portal.families(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  UNIQUE (id, family_id)
);
CREATE INDEX children_family ON portal.children(family_id, id);
CREATE TABLE portal.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  family_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  location_label text CHECK (location_label IS NULL OR length(btrim(location_label)) BETWEEN 1 AND 200),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  attendance text NOT NULL DEFAULT 'not_recorded' CHECK (attendance IN ('not_recorded','present','absent')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  FOREIGN KEY (child_id, family_id) REFERENCES portal.children(id, family_id),
  UNIQUE (id, child_id, family_id)
);
CREATE INDEX sessions_family_start ON portal.sessions(family_id, starts_at, id);
REVOKE ALL ON portal.children, portal.sessions FROM PUBLIC;

-- Hold the same staff membership and assignment rows modified by revocation/assignment.
CREATE FUNCTION portal.require_family_worker(p_subject text, p_family uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid;
BEGIN
  SELECT id INTO actor FROM portal.memberships WHERE subject=p_subject AND role='admin' AND revoked_at IS NULL FOR SHARE;
  IF actor IS NOT NULL THEN RETURN actor; END IF;
  SELECT id INTO actor FROM portal.memberships WHERE subject=p_subject AND role='staff' AND revoked_at IS NULL FOR SHARE;
  IF actor IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM portal.staff_family_assignments WHERE staff_id=actor AND family_id=p_family FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN actor;
END $$;

CREATE FUNCTION portal.create_child(p_subject text, p_family uuid, p_name text, p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  IF p_id IS NULL OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid child' USING ERRCODE='22023'; END IF;
  INSERT INTO portal.children(id,family_id,display_name,created_by) VALUES(p_id,p_family,btrim(p_name),actor);
  PERFORM pg_notify('portal_changes',json_build_object('kind','child','id',p_id)::text);
  RETURN p_id;
END $$;
CREATE FUNCTION portal.rename_child(p_subject text,p_child uuid,p_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid child' USING ERRCODE='22023'; END IF;
  UPDATE portal.children SET display_name=btrim(p_name) WHERE id=p_child;
  IF NOT FOUND THEN RAISE EXCEPTION 'child not found' USING ERRCODE='22023'; END IF;
  PERFORM pg_notify('portal_changes',json_build_object('kind','child','id',p_child)::text);
END $$;
CREATE FUNCTION portal.list_children(p_subject text, p_family uuid)
RETURNS TABLE(id uuid, family_id uuid, display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.read_family(p_subject,p_family)) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT c.id,c.family_id,c.display_name FROM portal.children c WHERE c.family_id=p_family ORDER BY c.created_at,c.id;
END $$;
CREATE FUNCTION portal.schedule_child_session(p_subject text,p_child uuid,p_start timestamptz,p_minutes integer,p_id uuid,p_location text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; family uuid;
BEGIN
  actor:=portal.require_admin(p_subject);
  IF p_start IS NULL OR NOT isfinite(p_start) OR p_id IS NULL OR p_minutes IS NULL OR p_minutes NOT BETWEEN 1 AND 1440 OR (p_location IS NOT NULL AND length(btrim(p_location)) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='22023'; END IF;
  SELECT family_id INTO family FROM portal.children WHERE id=p_child;
  IF family IS NULL THEN RAISE EXCEPTION 'child not found' USING ERRCODE='22023'; END IF;
  INSERT INTO portal.sessions(id,child_id,family_id,starts_at,duration_minutes,created_by,location_label) VALUES(p_id,p_child,family,p_start,p_minutes,actor,btrim(p_location));
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_id)::text);
  RETURN p_id;
END $$;
CREATE FUNCTION portal.reschedule_child_session(p_subject text,p_session uuid,p_start timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_start IS NULL OR NOT isfinite(p_start) THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='22023'; END IF;
  UPDATE portal.sessions SET starts_at=p_start WHERE id=p_session AND status='scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'session unavailable for rescheduling' USING ERRCODE='22023'; END IF;
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_session)::text);
END $$;
CREATE FUNCTION portal.set_session_location(p_subject text,p_session uuid,p_location text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_location IS NOT NULL AND length(btrim(p_location)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid location' USING ERRCODE='22023'; END IF;
  UPDATE portal.sessions SET location_label=btrim(p_location) WHERE id=p_session;
  IF NOT FOUND THEN RAISE EXCEPTION 'session not found' USING ERRCODE='22023'; END IF;
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_session)::text);
END $$;
CREATE FUNCTION portal.list_child_sessions(p_subject text,p_family uuid)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.read_family(p_subject,p_family)) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label FROM portal.sessions s WHERE s.family_id=p_family ORDER BY s.starts_at,s.id;
END $$;
CREATE FUNCTION portal.update_session(p_subject text,p_session uuid,p_status text,p_attendance text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE current_session portal.sessions%ROWTYPE;
BEGIN
  SELECT * INTO current_session FROM portal.sessions WHERE id=p_session;
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  PERFORM portal.require_family_worker(p_subject,current_session.family_id);
  SELECT * INTO current_session FROM portal.sessions WHERE id=p_session FOR UPDATE;
  IF p_status IS NOT NULL AND p_status <> current_session.status AND NOT (
    (current_session.status='scheduled' AND p_status IN ('in_progress','cancelled')) OR
    (current_session.status='in_progress' AND p_status IN ('completed','cancelled'))
  ) THEN RAISE EXCEPTION 'invalid session transition' USING ERRCODE='22023'; END IF;
  IF p_attendance IS NOT NULL AND p_attendance NOT IN ('not_recorded','present','absent') THEN RAISE EXCEPTION 'invalid attendance' USING ERRCODE='22023'; END IF;
  UPDATE portal.sessions SET status=COALESCE(p_status,status), attendance=COALESCE(p_attendance,attendance) WHERE id=p_session;
  PERFORM pg_notify('portal_changes',json_build_object('kind','session','id',p_session)::text);
END $$;
REVOKE ALL ON FUNCTION portal.require_family_worker(text,uuid), portal.create_child(text,uuid,text,uuid), portal.rename_child(text,uuid,text), portal.list_children(text,uuid), portal.schedule_child_session(text,uuid,timestamptz,integer,uuid,text), portal.set_session_location(text,uuid,text), portal.reschedule_child_session(text,uuid,timestamptz), portal.list_child_sessions(text,uuid), portal.update_session(text,uuid,text,text) FROM PUBLIC;
COMMIT;
