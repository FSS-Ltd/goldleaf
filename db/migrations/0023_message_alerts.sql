-- Local alert outbox. Provision a separate worker role explicitly outside this migration.
BEGIN;
ALTER TABLE portal.staff_family_assignments ADD COLUMN alert_generation uuid NOT NULL DEFAULT gen_random_uuid();

CREATE FUNCTION portal.protect_assignment_alert_generation() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF NEW.alert_generation IS DISTINCT FROM OLD.alert_generation THEN
  RAISE EXCEPTION 'assignment generation is immutable' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_assignment_alert_generation BEFORE UPDATE ON portal.staff_family_assignments
 FOR EACH ROW EXECUTE FUNCTION portal.protect_assignment_alert_generation();

CREATE TABLE portal.alert_request_origin (
 request_id uuid PRIMARY KEY REFERENCES portal.session_change_requests(id),
 membership_id uuid NOT NULL REFERENCES portal.memberships(id),
 membership_generation bigint NOT NULL
);

CREATE TABLE portal.alert_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('message.created','request.created','request.resolved')),
 source_id text NOT NULL,
 family_id uuid NOT NULL REFERENCES portal.families(id),
 UNIQUE (kind, source_id)
);
CREATE TABLE portal.alert_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES portal.alert_events(id),
 subject text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','sent','cancelled','uncertain')),
 due_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 lease_token uuid, lease_until timestamptz,
 payload jsonb, idempotency_key text, first_attempt_at timestamptz,
 UNIQUE (event_id, subject),
 CHECK ((status = 'leased') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK ((payload IS NULL AND idempotency_key IS NULL AND first_attempt_at IS NULL) OR
        (payload IS NOT NULL AND idempotency_key IS NOT NULL AND first_attempt_at IS NOT NULL))
);
CREATE INDEX alert_deliveries_due ON portal.alert_deliveries (due_at) WHERE status='pending';
CREATE INDEX alert_deliveries_lease ON portal.alert_deliveries (lease_until) WHERE status='leased';
CREATE TABLE portal.alert_paths (
 delivery_id uuid NOT NULL REFERENCES portal.alert_deliveries(id),
 membership_id uuid NOT NULL REFERENCES portal.memberships(id),
 membership_generation bigint NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','parent','staff')),
 assignment_generation uuid,
 PRIMARY KEY (delivery_id, membership_id)
);
REVOKE ALL ON portal.alert_request_origin, portal.alert_events, portal.alert_deliveries, portal.alert_paths FROM PUBLIC;

CREATE FUNCTION portal.record_alert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE event_kind text; source text; family uuid; author uuid; event uuid; parent uuid; origin_generation bigint;
BEGIN
 IF TG_TABLE_NAME='family_messages' THEN
  event_kind:='message.created'; source:=NEW.sequence::text; family:=NEW.family_id; author:=NEW.author_id;
 ELSIF TG_OP='INSERT' THEN
  event_kind:='request.created'; source:=NEW.id::text; family:=NEW.family_id; author:=NEW.parent_id;
  INSERT INTO portal.alert_request_origin(request_id,membership_id,membership_generation) SELECT NEW.id,m.id,m.access_generation FROM portal.memberships m WHERE m.id=NEW.parent_id;
 ELSE
  IF OLD.resolved_at IS NOT NULL OR NEW.resolved_at IS NULL THEN RETURN NEW; END IF;
  event_kind:='request.resolved'; source:=NEW.id::text; family:=NEW.family_id; author:=NEW.resolved_by; parent:=NEW.parent_id;
  SELECT o.membership_generation INTO origin_generation FROM portal.alert_request_origin o WHERE o.request_id=NEW.id AND o.membership_id=parent;
 END IF;
 INSERT INTO portal.alert_events(kind,source_id,family_id) VALUES(event_kind,source,family)
 ON CONFLICT (kind,source_id) DO NOTHING RETURNING id INTO event;
 IF event IS NULL THEN RETURN NEW; END IF;
 INSERT INTO portal.alert_deliveries(event_id,subject)
 SELECT event,m.subject FROM portal.memberships m
 LEFT JOIN portal.staff_family_assignments a ON a.staff_id=m.id AND a.family_id=family
 WHERE m.revoked_at IS NULL AND m.subject<>(SELECT subject FROM portal.memberships WHERE id=author)
 AND ((event_kind='message.created' AND (m.role='admin' OR (m.role='parent' AND m.family_id=family) OR (m.role='staff' AND a.staff_id IS NOT NULL)))
   OR (event_kind='request.created' AND m.role='admin')
   OR (event_kind='request.resolved' AND m.id=parent AND m.access_generation=origin_generation AND m.role='parent' AND m.family_id=family))
 GROUP BY m.subject;
 INSERT INTO portal.alert_paths(delivery_id,membership_id,membership_generation,role,assignment_generation)
 SELECT d.id,m.id,m.access_generation,m.role,CASE WHEN m.role='staff' THEN a.alert_generation END
 FROM portal.alert_deliveries d JOIN portal.memberships m ON m.subject=d.subject AND m.revoked_at IS NULL
 LEFT JOIN portal.staff_family_assignments a ON a.staff_id=m.id AND a.family_id=family
 WHERE d.event_id=event AND ((event_kind='message.created' AND (m.role='admin' OR (m.role='parent' AND m.family_id=family) OR (m.role='staff' AND a.staff_id IS NOT NULL)))
   OR (event_kind='request.created' AND m.role='admin')
   OR (event_kind='request.resolved' AND m.id=parent AND m.access_generation=origin_generation AND m.role='parent' AND m.family_id=family));
 PERFORM pg_notify('portal_alerts','');
 RETURN NEW;
END $$;
CREATE TRIGGER alert_message AFTER INSERT ON portal.family_messages FOR EACH ROW EXECUTE FUNCTION portal.record_alert();
CREATE TRIGGER alert_request_created AFTER INSERT ON portal.session_change_requests FOR EACH ROW EXECUTE FUNCTION portal.record_alert();
CREATE TRIGGER alert_request_resolved AFTER UPDATE OF resolved_at ON portal.session_change_requests FOR EACH ROW EXECUTE FUNCTION portal.record_alert();

CREATE FUNCTION portal.message_attention(p_subject text,p_role text) RETURNS TABLE(unread text,open_requests text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 RETURN QUERY SELECT coalesce(sum(s.unread::bigint),0)::text,
  CASE WHEN p_role='admin' THEN (SELECT count(*)::text FROM portal.session_change_requests r WHERE r.resolved_at IS NULL) ELSE '0' END
 FROM portal.message_family_summaries(p_subject,p_role) s;
END $$;

CREATE FUNCTION portal.alert_claim(p_lease_seconds integer)
RETURNS TABLE(delivery_id uuid,lease_token uuid,subject text,event_kind text,family_id uuid,payload jsonb,idempotency_key text,first_attempt_at timestamptz,attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE target uuid; token uuid:=gen_random_uuid();
BEGIN
 IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'invalid lease' USING ERRCODE='22023'; END IF;
 LOOP
  SELECT d.id INTO target FROM portal.alert_deliveries d
  WHERE (d.status='pending' AND d.due_at<=clock_timestamp()) OR (d.status='leased' AND d.lease_until<=clock_timestamp())
  ORDER BY CASE WHEN d.status='pending' THEN d.due_at ELSE d.lease_until END,d.id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF target IS NULL THEN RETURN; END IF;
  UPDATE portal.alert_deliveries d SET status='uncertain',lease_token=NULL,lease_until=NULL
  WHERE d.id=target AND (d.attempts>=8 OR d.first_attempt_at<=clock_timestamp()-interval '23 hours');
  IF FOUND THEN CONTINUE; END IF;
  UPDATE portal.alert_deliveries d SET status='leased',attempts=d.attempts+1,lease_token=token,lease_until=clock_timestamp()+make_interval(secs=>p_lease_seconds) WHERE d.id=target;
  RETURN QUERY SELECT d.id,d.lease_token,d.subject,e.kind,e.family_id,d.payload,d.idempotency_key,d.first_attempt_at,d.attempts FROM portal.alert_deliveries d JOIN portal.alert_events e ON e.id=d.event_id WHERE d.id=target;
  RETURN;
 END LOOP;
END $$;
CREATE FUNCTION portal.alert_next_due() RETURNS timestamptz
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
 SELECT min(CASE WHEN status='pending' THEN due_at WHEN status='leased' THEN lease_until END) FROM portal.alert_deliveries WHERE status IN ('pending','leased');
$$;
CREATE FUNCTION portal.alert_gate(p_delivery uuid,p_token uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE d portal.alert_deliveries%ROWTYPE; e portal.alert_events%ROWTYPE; path record;
BEGIN
 SELECT * INTO d FROM portal.alert_deliveries WHERE id=p_delivery AND status='leased' AND lease_token=p_token AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO e FROM portal.alert_events WHERE id=d.event_id;
 -- Try paths in a fixed role order; lock each path in the writer's order.
 FOR path IN SELECT p.* FROM portal.alert_paths p WHERE p.delivery_id=d.id
  ORDER BY CASE p.role WHEN 'admin' THEN 0 WHEN 'parent' THEN 1 ELSE 2 END,p.membership_id LOOP
  IF path.role='parent' THEN
   PERFORM 1 FROM portal.families WHERE id=e.family_id FOR SHARE;
  ELSIF path.role='staff' THEN
   PERFORM 1 FROM portal.staff_invitation_order WHERE singleton FOR SHARE;
  END IF;
  PERFORM 1 FROM portal.memberships m WHERE m.id=path.membership_id AND m.subject=d.subject AND m.role=path.role AND (m.role<>'parent' OR m.family_id=e.family_id) AND m.revoked_at IS NULL AND m.access_generation=path.membership_generation FOR SHARE;
  IF FOUND THEN
   IF path.assignment_generation IS NULL THEN RETURN true; END IF;
   PERFORM 1 FROM portal.staff_family_assignments a WHERE a.staff_id=path.membership_id AND a.family_id=e.family_id AND a.alert_generation=path.assignment_generation FOR SHARE;
   IF FOUND THEN RETURN true; END IF;
  END IF;
 END LOOP;
 RETURN false;
END $$;
CREATE FUNCTION portal.alert_freeze(p_delivery uuid,p_token uuid,p_payload jsonb,p_key text)
RETURNS TABLE(payload jsonb,idempotency_key text,first_attempt_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR
    (SELECT count(*) FROM jsonb_object_keys(p_payload))<>4 OR
    NOT (p_payload ?& ARRAY['from','to','subject','text']) OR
    jsonb_typeof(p_payload->'from')<>'string' OR jsonb_typeof(p_payload->'to')<>'string' OR
    jsonb_typeof(p_payload->'subject')<>'string' OR jsonb_typeof(p_payload->'text')<>'string' OR
    length(p_payload->>'from') NOT BETWEEN 1 AND 320 OR length(p_payload->>'to') NOT BETWEEN 1 AND 320 OR
    p_payload->>'subject'<>'You have a Goldleaf update' OR
    p_payload->>'text' !~ E'^There is an update in your Goldleaf portal\\. Sign in to view it:\\n\\nhttps?://[A-Za-z0-9.-]+(:[0-9]{1,5})?/portal$' OR
    p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'invalid payload' USING ERRCODE='22023';
 END IF;
 UPDATE portal.alert_deliveries d SET payload=coalesce(d.payload,p_payload),idempotency_key=coalesce(d.idempotency_key,p_key),first_attempt_at=coalesce(d.first_attempt_at,clock_timestamp())
 WHERE d.id=p_delivery AND d.status='leased' AND d.lease_token=p_token AND d.lease_until>clock_timestamp() AND (d.first_attempt_at IS NULL OR d.first_attempt_at>clock_timestamp()-interval '23 hours');
 RETURN QUERY SELECT d.payload,d.idempotency_key,d.first_attempt_at FROM portal.alert_deliveries d WHERE d.id=p_delivery AND d.status='leased' AND d.lease_token=p_token AND d.lease_until>clock_timestamp() AND d.first_attempt_at>clock_timestamp()-interval '23 hours';
END $$;
CREATE FUNCTION portal.alert_finish(p_delivery uuid,p_token uuid,p_outcome text,p_retry_at timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF p_outcome NOT IN ('sent','retry','uncertain','cancelled') OR (p_outcome='retry' AND (p_retry_at IS NULL OR p_retry_at<=clock_timestamp())) THEN RAISE EXCEPTION 'invalid outcome' USING ERRCODE='22023'; END IF;
 UPDATE portal.alert_deliveries d SET status=CASE WHEN p_outcome='retry' AND (d.attempts>=8 OR (d.first_attempt_at IS NOT NULL AND p_retry_at>=d.first_attempt_at+interval '23 hours')) THEN 'uncertain' WHEN p_outcome='retry' THEN 'pending' ELSE p_outcome END,
 due_at=CASE WHEN p_outcome='retry' THEN p_retry_at ELSE d.due_at END,lease_token=NULL,lease_until=NULL
 WHERE d.id=p_delivery AND d.status='leased' AND d.lease_token=p_token AND d.lease_until>clock_timestamp();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION portal.protect_assignment_alert_generation(),portal.record_alert(),portal.message_attention(text,text),portal.alert_claim(integer),portal.alert_next_due(),portal.alert_gate(uuid,uuid),portal.alert_freeze(uuid,uuid,jsonb,text),portal.alert_finish(uuid,uuid,text,timestamptz) FROM PUBLIC;
COMMIT;
