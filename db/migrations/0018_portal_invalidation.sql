-- Commit-only, scoped invalidation for existing portal views; no content in payloads.
BEGIN;
CREATE FUNCTION portal.notify_admin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='invoice_payment_intents' THEN target:=coalesce(NEW.operation_id,OLD.operation_id);
 ELSIF TG_TABLE_NAME='invoice_lines' THEN target:=coalesce(NEW.invoice_id,OLD.invoice_id);
 ELSIF TG_TABLE_NAME='staff_family_assignments' THEN target:=coalesce(NEW.staff_id,OLD.staff_id);
 ELSIF TG_TABLE_NAME='billing_settings' THEN target:='00000000-0000-4000-8000-000000000001'::uuid;
 ELSE target:=coalesce(NEW.id,OLD.id); END IF;
 PERFORM pg_notify('portal_changes',json_build_object('kind','admin_change','id',target)::text);
 RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER portal_invoice_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.invoices FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_invoice_line_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.invoice_lines FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_invitation_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.invitations FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_staff_invitation_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.staff_invitations FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_membership_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.memberships FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_assignment_admin_change AFTER INSERT OR DELETE ON portal.staff_family_assignments FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_payment_intent_admin_change AFTER INSERT OR UPDATE OF status OR DELETE ON portal.invoice_payment_intents FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_invoice_notification_admin_change AFTER INSERT OR UPDATE OR DELETE ON portal.invoice_notifications FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE TRIGGER portal_billing_settings_admin_change AFTER UPDATE ON portal.billing_settings FOR EACH ROW EXECUTE FUNCTION portal.notify_admin_change();
CREATE FUNCTION portal.notify_invoice_family() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE invoice uuid;
BEGIN
 IF TG_TABLE_NAME='invoice_payments' THEN invoice:=NEW.invoice_id; ELSE invoice:=NEW.id; END IF;
 PERFORM pg_notify('portal_changes',json_build_object('kind','invoice_family','id',invoice)::text);
 RETURN NEW;
END $$;
CREATE TRIGGER portal_invoice_issued_change AFTER UPDATE OF issued_at ON portal.invoices FOR EACH ROW WHEN (OLD.issued_at IS NULL AND NEW.issued_at IS NOT NULL) EXECUTE FUNCTION portal.notify_invoice_family();
CREATE TRIGGER portal_invoice_payment_change AFTER INSERT ON portal.invoice_payments FOR EACH ROW EXECUTE FUNCTION portal.notify_invoice_family();
CREATE FUNCTION portal.notify_family_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='founding_slots' THEN
  IF OLD.family_id IS NOT NULL THEN PERFORM pg_notify('portal_changes',json_build_object('kind','founding_profile','id',OLD.family_id)::text); END IF;
  IF NEW.family_id IS NOT NULL AND NEW.family_id IS DISTINCT FROM OLD.family_id THEN PERFORM pg_notify('portal_changes',json_build_object('kind','founding_profile','id',NEW.family_id)::text); END IF;
 ELSE PERFORM pg_notify('portal_changes',json_build_object('kind','family_profile','id',NEW.id)::text); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_family_profile_change AFTER INSERT OR UPDATE OF display_name ON portal.families FOR EACH ROW EXECUTE FUNCTION portal.notify_family_profile();
CREATE TRIGGER portal_founding_profile_change AFTER UPDATE OF family_id ON portal.founding_slots FOR EACH ROW WHEN (OLD.family_id IS DISTINCT FROM NEW.family_id) EXECUTE FUNCTION portal.notify_family_profile();
CREATE FUNCTION portal.notify_read_cursor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
 PERFORM pg_notify('portal_changes',json_build_object('kind','read_cursor','id',NEW.membership_id)::text);
 RETURN NEW;
END $$;
CREATE TRIGGER portal_cursor_created AFTER INSERT ON portal.message_read_cursors FOR EACH ROW EXECUTE FUNCTION portal.notify_read_cursor();
CREATE TRIGGER portal_cursor_advanced AFTER UPDATE OF through_sequence ON portal.message_read_cursors FOR EACH ROW WHEN (NEW.through_sequence IS DISTINCT FROM OLD.through_sequence) EXECUTE FUNCTION portal.notify_read_cursor();
CREATE OR REPLACE FUNCTION portal.mark_family_messages_read(p_subject text,p_family uuid,p_through bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid;
BEGIN
 PERFORM 1 FROM portal.families WHERE id=p_family FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
 actor:=portal.require_message_access(p_subject,p_family);
 IF p_through IS NULL OR NOT EXISTS(SELECT 1 FROM portal.family_messages m WHERE m.family_id=p_family AND m.sequence=p_through) THEN RAISE EXCEPTION 'invalid read cursor' USING ERRCODE='22023'; END IF;
 INSERT INTO portal.message_read_cursors(family_id,membership_id,through_sequence) VALUES(p_family,actor,p_through)
 ON CONFLICT(family_id,membership_id) DO UPDATE SET through_sequence=EXCLUDED.through_sequence WHERE portal.message_read_cursors.through_sequence<EXCLUDED.through_sequence;
END $$;
-- Role-specific transport prevents a dual-role account's staff view receiving admin timing.
CREATE FUNCTION portal.portal_event_active(p_subject text,p_role text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
 SELECT p_role IN ('admin','parent','staff') AND EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role=p_role AND m.revoked_at IS NULL);
$$;
CREATE FUNCTION portal.resolve_portal_event(p_subject text,p_kind text,p_id uuid,p_role text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE family uuid; parent_actor uuid; allow_parent boolean := true; allow_staff boolean := true;
BEGIN
 IF p_role NOT IN ('admin','parent','staff') OR p_role IS NULL THEN RETURN NULL; END IF;
 IF p_kind='access' THEN
  IF EXISTS(SELECT 1 FROM portal.memberships m WHERE m.id=p_id AND m.subject=p_subject AND m.role=p_role) THEN RETURN 'access_changed'; END IF;
  RETURN NULL;
 ELSIF p_kind='read_cursor' THEN
  IF EXISTS(SELECT 1 FROM portal.memberships m WHERE m.id=p_id AND m.subject=p_subject AND m.revoked_at IS NULL) AND portal.portal_event_active(p_subject,p_role) THEN RETURN 'change'; END IF;
  RETURN NULL;
 ELSIF p_kind='admin_change' THEN
  IF p_role='admin' AND portal.portal_event_active(p_subject,p_role) THEN RETURN 'change'; END IF;
  RETURN NULL;
 END IF;
 IF p_kind IN ('message','family_profile','founding_profile') THEN family:=p_id; IF p_kind='founding_profile' THEN allow_staff:=false; END IF;
 ELSIF p_kind='invoice_family' THEN SELECT i.family_id INTO family FROM portal.invoices i WHERE i.id=p_id AND i.issued_at IS NOT NULL; allow_staff:=false;
 ELSIF p_kind='request' THEN SELECT r.family_id,r.parent_id INTO family,parent_actor FROM portal.session_change_requests r WHERE r.id=p_id;
 ELSIF p_kind IN ('session','session_public') THEN SELECT s.family_id INTO family FROM portal.sessions s WHERE s.id=p_id; allow_parent:=p_kind='session_public';
 ELSIF p_kind='child' THEN SELECT c.family_id INTO family FROM portal.children c WHERE c.id=p_id;
 ELSIF p_kind='learning' THEN SELECT u.family_id INTO family FROM portal.published_learning_updates u WHERE u.id=p_id;
 ELSE RETURN NULL;
 END IF;
 IF family IS NULL THEN RETURN NULL; END IF;
 IF p_role='admin' AND portal.portal_event_active(p_subject,p_role) THEN RETURN 'change'; END IF;
 IF parent_actor IS NOT NULL THEN
  IF p_role='parent' AND EXISTS(SELECT 1 FROM portal.memberships m WHERE m.id=parent_actor AND m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL AND m.family_id=family) THEN RETURN 'change'; END IF;
  RETURN NULL;
 END IF;
 IF p_role='parent' AND allow_parent AND EXISTS(SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='parent' AND m.revoked_at IS NULL AND m.family_id=family) THEN RETURN 'change'; END IF;
 IF p_role='staff' AND allow_staff AND EXISTS(SELECT 1 FROM portal.memberships m JOIN portal.staff_family_assignments a ON a.staff_id=m.id WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL AND a.family_id=family) THEN RETURN 'change'; END IF;
 RETURN NULL;
END $$;
-- Old clients are not mounted; deny their role-less event delivery during rollout.
CREATE OR REPLACE FUNCTION portal.family_message_unread(p_subject text,p_family uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
DECLARE actor uuid; result text;
BEGIN
 actor:=portal.require_message_access(p_subject,p_family);
 SELECT count(*)::text INTO result FROM portal.family_messages m LEFT JOIN portal.message_read_cursors c ON c.family_id=p_family AND c.membership_id=actor
 WHERE m.family_id=p_family AND m.sequence>coalesce(c.through_sequence,0) AND NOT EXISTS(SELECT 1 FROM portal.memberships author WHERE author.id=m.author_id AND author.subject=p_subject);
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION portal.resolve_portal_event(p_subject text,p_kind text,p_id uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$ SELECT NULL::text $$;
REVOKE ALL ON FUNCTION portal.notify_admin_change(),portal.notify_invoice_family(),portal.notify_family_profile(),portal.notify_read_cursor(),portal.portal_event_active(text,text),portal.resolve_portal_event(text,text,uuid,text) FROM PUBLIC;
COMMIT;
