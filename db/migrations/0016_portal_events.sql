-- Notifications contain only opaque identifiers; access is resolved on every delivery.
BEGIN;
CREATE FUNCTION portal.notify_public_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM pg_notify('portal_changes',json_build_object('kind','session_public','id',NEW.id)::text);
 RETURN NEW;
END $$;
CREATE TRIGGER portal_session_public_change AFTER INSERT OR UPDATE OF starts_at,location_label,duration_minutes,status,attendance ON portal.sessions FOR EACH ROW EXECUTE FUNCTION portal.notify_public_session();
CREATE FUNCTION portal.notify_access_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='memberships' THEN target:=coalesce(NEW.id,OLD.id); ELSE target:=coalesce(NEW.staff_id,OLD.staff_id); END IF;
 PERFORM pg_notify('portal_changes',json_build_object('kind','access','id',target)::text);
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER portal_membership_access_change AFTER INSERT OR UPDATE OF revoked_at OR DELETE ON portal.memberships FOR EACH ROW EXECUTE FUNCTION portal.notify_access_change();
CREATE TRIGGER portal_staff_assignment_change AFTER INSERT OR DELETE ON portal.staff_family_assignments FOR EACH ROW EXECUTE FUNCTION portal.notify_access_change();
CREATE FUNCTION portal.portal_event_active(p_subject text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
 SELECT EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.revoked_at IS NULL);
$$;
CREATE FUNCTION portal.resolve_portal_event(p_subject text,p_kind text,p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE family uuid; parent_actor uuid; allow_parent boolean := true;
BEGIN
 IF p_kind='access' THEN
  IF EXISTS(SELECT 1 FROM portal.memberships m WHERE m.id=p_id AND m.subject=p_subject) THEN RETURN 'access_changed'; END IF;
  RETURN NULL;
 END IF;
 IF p_kind='message' THEN family:=p_id;
 ELSIF p_kind='request' THEN SELECT r.family_id,r.parent_id INTO family,parent_actor FROM portal.session_change_requests r WHERE r.id=p_id;
 ELSIF p_kind IN ('session','session_public') THEN SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_id; allow_parent:=p_kind='session_public';
 ELSIF p_kind='child' THEN SELECT c.family_id INTO family FROM portal.children c WHERE c.id=p_id;
 ELSIF p_kind='learning' THEN SELECT u.family_id INTO family FROM portal.published_learning_updates u WHERE u.id=p_id;
 ELSE RETURN NULL;
 END IF;
 IF family IS NULL THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='admin' AND m.revoked_at IS NULL) THEN RETURN 'change'; END IF;
 IF parent_actor IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM portal.memberships m WHERE m.id=parent_actor AND m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL AND m.family_id=family) THEN RETURN 'change'; END IF;
  RETURN NULL;
 END IF;
 IF allow_parent AND EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL AND m.family_id=family) THEN RETURN 'change'; END IF;
 IF EXISTS(SELECT 1 FROM portal.memberships m JOIN portal.staff_family_assignments a ON a.staff_id=m.id WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL AND a.family_id=family) THEN RETURN 'change'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION portal.notify_public_session(),portal.notify_access_change(),portal.portal_event_active(text),portal.resolve_portal_event(text,text,uuid) FROM PUBLIC;
COMMIT;
