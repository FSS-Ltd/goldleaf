-- Family messages and session change requests. Only trusted server callers supply subjects.
BEGIN;
CREATE TABLE portal.family_messages (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL UNIQUE,
  family_id uuid NOT NULL REFERENCES portal.families(id),
  author_id uuid NOT NULL REFERENCES portal.memberships(id),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX family_messages_order ON portal.family_messages(family_id, sequence);
CREATE TABLE portal.message_read_cursors (
  family_id uuid NOT NULL REFERENCES portal.families(id),
  membership_id uuid NOT NULL REFERENCES portal.memberships(id),
  through_sequence bigint NOT NULL CHECK (through_sequence > 0),
  PRIMARY KEY(family_id, membership_id)
);
REVOKE ALL ON portal.family_messages, portal.message_read_cursors FROM PUBLIC;
REVOKE ALL ON SEQUENCE portal.family_messages_sequence_seq FROM PUBLIC;

-- Caller locks the family first. Lock the actual active membership and staff assignment
-- so revocation cannot race a successful mutation.
CREATE FUNCTION portal.require_message_access(p_subject text, p_family uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid;
BEGIN
 SELECT m.id INTO actor FROM portal.memberships m
 WHERE m.subject=p_subject AND m.revoked_at IS NULL AND (m.role='admin' OR (m.role='parent' AND m.family_id=p_family))
 ORDER BY CASE m.role WHEN 'admin' THEN 0 ELSE 1 END, m.id LIMIT 1 FOR SHARE;
 IF actor IS NOT NULL THEN RETURN actor; END IF;
 SELECT m.id INTO actor FROM portal.memberships m JOIN portal.staff_family_assignments a ON a.staff_id=m.id
 WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL AND a.family_id=p_family
 LIMIT 1 FOR SHARE OF m,a;
 IF actor IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 RETURN actor;
END $$;
CREATE FUNCTION portal.send_family_message(p_subject text,p_family uuid,p_operation uuid,p_body text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid; prior portal.family_messages%ROWTYPE; result bigint;
BEGIN
 IF p_operation IS NULL OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_operation::text,0));
 PERFORM 1 FROM portal.families WHERE id=p_family FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 actor:=portal.require_message_access(p_subject,p_family);
 SELECT * INTO prior FROM portal.family_messages WHERE operation_id=p_operation;
 IF FOUND THEN
   IF prior.family_id<>p_family OR prior.author_id<>actor OR prior.body<>btrim(p_body) THEN RAISE EXCEPTION 'operation conflict' USING ERRCODE='22023'; END IF;
   RETURN prior.sequence;
 END IF;
 INSERT INTO portal.family_messages(operation_id,family_id,author_id,body) VALUES(p_operation,p_family,actor,btrim(p_body)) RETURNING sequence INTO result;
 PERFORM pg_notify('portal_changes',json_build_object('kind','message','id',p_family)::text);
 RETURN result;
END $$;
CREATE FUNCTION portal.list_family_messages(p_subject text,p_family uuid)
RETURNS TABLE(sequence text,author_id uuid,body text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM portal.require_message_access(p_subject,p_family);
 RETURN QUERY SELECT m.sequence::text,m.author_id,m.body,m.created_at FROM portal.family_messages m WHERE m.family_id=p_family ORDER BY m.sequence;
END $$;
CREATE FUNCTION portal.mark_family_messages_read(p_subject text,p_family uuid,p_through bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid;
BEGIN
 PERFORM 1 FROM portal.families WHERE id=p_family FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 actor:=portal.require_message_access(p_subject,p_family);
 IF p_through IS NULL OR NOT EXISTS(SELECT 1 FROM portal.family_messages m WHERE m.family_id=p_family AND m.sequence=p_through) THEN RAISE EXCEPTION 'invalid read cursor' USING ERRCODE='22023'; END IF;
 INSERT INTO portal.message_read_cursors(family_id,membership_id,through_sequence) VALUES(p_family,actor,p_through)
 ON CONFLICT(family_id,membership_id) DO UPDATE SET through_sequence=greatest(portal.message_read_cursors.through_sequence,EXCLUDED.through_sequence);
 PERFORM pg_notify('portal_changes',json_build_object('kind','message','id',p_family)::text);
END $$;
CREATE FUNCTION portal.family_message_unread(p_subject text,p_family uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid; result text;
BEGIN
 actor:=portal.require_message_access(p_subject,p_family);
 SELECT count(*)::text INTO result FROM portal.family_messages m LEFT JOIN portal.message_read_cursors c ON c.family_id=p_family AND c.membership_id=actor
 WHERE m.family_id=p_family AND m.sequence>coalesce(c.through_sequence,0) AND m.author_id<>actor;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION portal.require_message_access(text,uuid),portal.send_family_message(text,uuid,uuid,text),portal.list_family_messages(text,uuid),portal.mark_family_messages_read(text,uuid,bigint),portal.family_message_unread(text,uuid) FROM PUBLIC;

CREATE TABLE portal.session_change_requests (
 id uuid PRIMARY KEY,
 family_id uuid NOT NULL REFERENCES portal.families(id),
 session_id uuid NOT NULL REFERENCES portal.sessions(id),
 parent_id uuid NOT NULL REFERENCES portal.memberships(id),
 body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES portal.memberships(id),
 rescheduled_start timestamptz,
 resolution text CHECK (resolution IS NULL OR length(btrim(resolution)) BETWEEN 1 AND 4000)
);
CREATE INDEX session_change_requests_family ON portal.session_change_requests(family_id,created_at,id);
REVOKE ALL ON portal.session_change_requests FROM PUBLIC;
CREATE FUNCTION portal.request_session_change(p_subject text,p_session uuid,p_id uuid,p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE family uuid; actor uuid; prior portal.session_change_requests%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT family_id INTO family FROM portal.sessions WHERE id=p_session;
 IF family IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM portal.families WHERE id=family FOR UPDATE;
 SELECT m.id INTO actor FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.family_id=family AND m.revoked_at IS NULL FOR SHARE;
 IF actor IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM portal.session_change_requests WHERE id=p_id;
 IF FOUND THEN
  IF prior.family_id<>family OR prior.session_id<>p_session OR prior.parent_id<>actor OR prior.body<>btrim(p_body) THEN RAISE EXCEPTION 'operation conflict' USING ERRCODE='22023'; END IF;
  RETURN prior.id;
 END IF;
 INSERT INTO portal.session_change_requests(id,family_id,session_id,parent_id,body) VALUES(p_id,family,p_session,actor,btrim(p_body));
 PERFORM pg_notify('portal_changes',json_build_object('kind','request','id',p_id)::text);
 RETURN p_id;
END $$;
CREATE FUNCTION portal.list_session_change_requests(p_subject text,p_family uuid)
RETURNS TABLE(id uuid,session_id uuid,parent_id uuid,body text,created_at timestamptz,resolved_at timestamptz,resolution text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid; actor_role text;
BEGIN
 actor:=portal.require_message_access(p_subject,p_family);
 SELECT role INTO actor_role FROM portal.memberships WHERE portal.memberships.id=actor;
 IF actor_role='staff' THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT r.id,r.session_id,r.parent_id,r.body,r.created_at,r.resolved_at,r.resolution FROM portal.session_change_requests r WHERE r.family_id=p_family AND (actor_role='admin' OR r.parent_id=actor) ORDER BY r.created_at,r.id;
END $$;
CREATE FUNCTION portal.resolve_session_change(p_subject text,p_id uuid,p_resolution text,p_new_start timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid; request portal.session_change_requests%ROWTYPE;
BEGIN
 actor:=portal.require_admin(p_subject);
 IF p_resolution IS NULL OR length(btrim(p_resolution)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid resolution' USING ERRCODE='22023'; END IF;
 SELECT * INTO request FROM portal.session_change_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'request unavailable' USING ERRCODE='22023'; END IF;
 IF request.resolved_at IS NOT NULL THEN
  IF request.resolved_by=actor AND request.resolution=btrim(p_resolution) AND request.rescheduled_start IS NOT DISTINCT FROM p_new_start THEN RETURN; END IF;
  RAISE EXCEPTION 'request already resolved' USING ERRCODE='22023';
 END IF;
 IF p_new_start IS NOT NULL THEN PERFORM portal.reschedule_child_session(p_subject,request.session_id,p_new_start); END IF;
 UPDATE portal.session_change_requests SET resolved_at=clock_timestamp(),resolved_by=actor,resolution=btrim(p_resolution),rescheduled_start=p_new_start WHERE id=p_id;
 PERFORM pg_notify('portal_changes',json_build_object('kind','request','id',p_id)::text);
END $$;
REVOKE ALL ON FUNCTION portal.request_session_change(text,uuid,uuid,text),portal.list_session_change_requests(text,uuid),portal.resolve_session_change(text,uuid,text,timestamptz) FROM PUBLIC;
COMMIT;
