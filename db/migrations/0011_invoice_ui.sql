-- Forward-only. Existing invoice snapshots remain unchanged.
BEGIN;
ALTER TABLE portal.billing_settings ADD COLUMN issuer_contact text NOT NULL DEFAULT 'admin@goldleaf.education'
  CHECK (length(btrim(issuer_contact)) BETWEEN 1 AND 1000);

CREATE FUNCTION portal.snapshot_invoice_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF OLD.issued_at IS NULL AND NEW.issued_at IS NOT NULL THEN
    NEW.snapshot := NEW.snapshot || jsonb_build_object('issuer_contact', (SELECT issuer_contact FROM portal.billing_settings));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_snapshot_contact BEFORE UPDATE OF issued_at ON portal.invoices
  FOR EACH ROW EXECUTE FUNCTION portal.snapshot_invoice_contact();

CREATE FUNCTION portal.save_billing_settings_with_contact(p_subject text, p_name text, p_address text, p_contact text, p_vat boolean, p_vat_rate integer, p_vat_registration text, p_terms integer, p_method text, p_cadence text, p_transition date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF p_contact IS NULL OR length(btrim(p_contact)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'issuer contact required' USING ERRCODE='22023'; END IF;
  PERFORM portal.save_billing_settings(p_subject,p_name,p_address,p_vat,p_vat_rate,p_vat_registration,p_terms,p_method,p_cadence,p_transition);
  UPDATE portal.billing_settings SET issuer_contact=btrim(p_contact);
END $$;

CREATE FUNCTION portal.list_admin_invoices(p_subject text)
RETURNS TABLE (id uuid, family_id uuid, family_name text, recipient_name text, invoice_number text, issue_date text, due_date text, total_pence integer, paid_pence integer, is_issued boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.id, i.family_id, f.display_name, i.recipient_name, i.invoice_number::text,
    i.snapshot->>'issue_date', i.snapshot->>'due_date', (i.snapshot->>'total_pence')::integer,
    COALESCE((SELECT sum(p.amount_pence) FROM portal.invoice_payments p WHERE p.invoice_id=i.id),0)::integer,
    i.issued_at IS NOT NULL
  FROM portal.invoices i JOIN portal.families f ON f.id=i.family_id ORDER BY i.created_at DESC, i.id;
END $$;
CREATE FUNCTION portal.list_parent_invoices(p_subject text)
RETURNS TABLE(id uuid, family_id uuid, family_name text, snapshot jsonb, paid_pence integer)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
  SELECT i.id, i.family_id, f.display_name, i.snapshot,
    COALESCE((SELECT sum(p.amount_pence) FROM portal.invoice_payments p WHERE p.invoice_id=i.id),0)::integer
  FROM portal.invoices i JOIN portal.families f ON f.id=i.family_id
  WHERE i.issued_at IS NOT NULL AND EXISTS (SELECT 1 FROM portal.memberships m
    WHERE m.subject=p_subject AND m.role='parent' AND m.family_id=i.family_id AND m.revoked_at IS NULL)
  ORDER BY i.issued_at DESC, i.id;
$$;
REVOKE ALL ON FUNCTION portal.list_parent_invoices(text) FROM PUBLIC;

CREATE FUNCTION portal.read_invoice_payment_operation(p_subject text,p_invoice uuid,p_operation uuid)
RETURNS TABLE(amount_pence integer, paid_on text, reference text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  PERFORM 1 FROM portal.invoices i WHERE i.id=p_invoice AND i.issued_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT p.amount_pence, to_char(p.paid_on, 'YYYY-MM-DD'), p.reference
    FROM portal.invoice_payments p WHERE p.invoice_id=p_invoice AND p.operation_id=p_operation;
END $$;
REVOKE ALL ON FUNCTION portal.read_invoice_payment_operation(text,uuid,uuid) FROM PUBLIC;

CREATE FUNCTION portal.list_invoice_payments(p_subject text,p_invoice uuid)
RETURNS TABLE(amount_pence integer, paid_on text, reference text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT p.amount_pence, to_char(p.paid_on, 'YYYY-MM-DD'), p.reference
    FROM portal.invoice_payments p JOIN portal.invoices i ON i.id=p.invoice_id
    WHERE i.id=p_invoice AND i.issued_at IS NOT NULL ORDER BY p.recorded_at, p.operation_id;
END $$;
REVOKE ALL ON FUNCTION portal.list_invoice_payments(text,uuid) FROM PUBLIC;

CREATE TABLE portal.invoice_payment_intents (
  operation_id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES portal.invoices(id),
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  paid_on date NOT NULL CHECK (isfinite(paid_on)),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 500),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','recorded','rejected'))
);
CREATE UNIQUE INDEX one_pending_payment_per_invoice ON portal.invoice_payment_intents(invoice_id) WHERE status='pending';
REVOKE ALL ON portal.invoice_payment_intents FROM PUBLIC;
CREATE FUNCTION portal.prepare_invoice_payment(p_subject text,p_invoice uuid,p_operation uuid,p_amount integer,p_paid_on date,p_reference text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; inv portal.invoices%ROWTYPE; existing portal.invoice_payment_intents%ROWTYPE; paid bigint; recorded portal.invoice_payments%ROWTYPE;
BEGIN
  actor := portal.require_admin(p_subject);
  SELECT * INTO inv FROM portal.invoices WHERE id=p_invoice FOR UPDATE;
  IF NOT FOUND OR inv.issued_at IS NULL THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE='22023'; END IF;
  IF p_operation IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_paid_on IS NULL OR NOT isfinite(p_paid_on) OR p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid payment' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM portal.invoice_payment_intents WHERE operation_id=p_operation FOR UPDATE;
  IF FOUND THEN
    IF existing.invoice_id IS DISTINCT FROM p_invoice OR existing.amount_pence IS DISTINCT FROM p_amount OR existing.paid_on IS DISTINCT FROM p_paid_on OR existing.reference IS DISTINCT FROM btrim(p_reference) THEN RAISE EXCEPTION 'payment operation conflict' USING ERRCODE='22023'; END IF;
    RETURN existing.status;
  END IF;
  SELECT * INTO recorded FROM portal.invoice_payments WHERE operation_id=p_operation;
  IF FOUND THEN
    IF recorded.invoice_id IS DISTINCT FROM p_invoice OR recorded.amount_pence IS DISTINCT FROM p_amount OR recorded.paid_on IS DISTINCT FROM p_paid_on OR recorded.reference IS DISTINCT FROM btrim(p_reference) THEN RAISE EXCEPTION 'payment operation conflict' USING ERRCODE='22023'; END IF;
    INSERT INTO portal.invoice_payment_intents(operation_id,invoice_id,amount_pence,paid_on,reference,created_by,status) VALUES(p_operation,p_invoice,p_amount,p_paid_on,btrim(p_reference),actor,'recorded');
    RETURN 'recorded';
  END IF;
  SELECT COALESCE(sum(amount_pence),0) INTO paid FROM portal.invoice_payments WHERE invoice_id=p_invoice;
  IF p_amount::bigint+paid > (inv.snapshot->>'total_pence')::bigint THEN RAISE EXCEPTION 'invalid payment amount' USING ERRCODE='22023'; END IF;
  INSERT INTO portal.invoice_payment_intents(operation_id,invoice_id,amount_pence,paid_on,reference,created_by) VALUES(p_operation,p_invoice,p_amount,p_paid_on,btrim(p_reference),actor);
  RETURN 'pending';
END $$;
CREATE FUNCTION portal.complete_invoice_payment(p_subject text,p_invoice uuid,p_operation uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE intent portal.invoice_payment_intents%ROWTYPE; reason text;
BEGIN
  PERFORM portal.require_admin(p_subject);
  PERFORM 1 FROM portal.invoices WHERE id=p_invoice AND issued_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE='22023'; END IF;
  SELECT * INTO intent FROM portal.invoice_payment_intents WHERE operation_id=p_operation AND invoice_id=p_invoice FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment intent unavailable' USING ERRCODE='22023'; END IF;
  IF intent.status <> 'pending' THEN RETURN intent.status; END IF;
  BEGIN
    PERFORM portal.record_invoice_payment(p_subject,p_invoice,p_operation,intent.amount_pence,intent.paid_on,intent.reference);
  EXCEPTION WHEN invalid_parameter_value THEN
    GET STACKED DIAGNOSTICS reason = MESSAGE_TEXT;
    IF reason <> 'invalid payment amount' THEN RAISE; END IF;
    UPDATE portal.invoice_payment_intents SET status='rejected' WHERE operation_id=p_operation;
    RETURN 'rejected';
  END;
  UPDATE portal.invoice_payment_intents SET status='recorded' WHERE operation_id=p_operation;
  RETURN 'recorded';
END $$;
CREATE FUNCTION portal.list_invoice_payment_intents(p_subject text,p_invoice uuid)
RETURNS TABLE(operation_id uuid,amount_pence integer,paid_on text,reference text,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT p.operation_id,p.amount_pence,to_char(p.paid_on,'YYYY-MM-DD'),p.reference,p.status
    FROM portal.invoice_payment_intents p JOIN portal.invoices i ON i.id=p.invoice_id
    WHERE p.invoice_id=p_invoice AND i.issued_at IS NOT NULL ORDER BY p.created_at,p.operation_id;
END $$;
REVOKE ALL ON FUNCTION portal.prepare_invoice_payment(text,uuid,uuid,integer,date,text),portal.complete_invoice_payment(text,uuid,uuid),portal.list_invoice_payment_intents(text,uuid) FROM PUBLIC;

CREATE TABLE portal.invoice_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES portal.invoices(id),
  membership_id uuid NOT NULL REFERENCES portal.memberships(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','uncertain')),
  attempt_id uuid,
  claim_id uuid,
  attempt_started_at timestamptz,
  lease_until timestamptz,
  recipient_email text,
  sender text,
  origin text,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (invoice_id, membership_id)
);
REVOKE ALL ON portal.invoice_notifications FROM PUBLIC;
CREATE FUNCTION portal.enqueue_invoice_notifications() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF OLD.issued_at IS NULL AND NEW.issued_at IS NOT NULL THEN
    INSERT INTO portal.invoice_notifications(invoice_id,membership_id)
      SELECT NEW.id,m.id FROM portal.memberships m WHERE m.family_id=NEW.family_id AND m.role='parent' AND m.revoked_at IS NULL
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enqueue_invoice_notifications AFTER UPDATE OF issued_at ON portal.invoices
  FOR EACH ROW EXECUTE FUNCTION portal.enqueue_invoice_notifications();

CREATE FUNCTION portal.prepare_invoice_notifications(p_subject text, p_invoice uuid)
RETURNS TABLE(id uuid, parent_subject text, status text, may_duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF NOT EXISTS (SELECT 1 FROM portal.invoices i WHERE i.id=p_invoice AND i.issued_at IS NOT NULL) THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE='22023'; END IF;
  INSERT INTO portal.invoice_notifications(invoice_id,membership_id)
    SELECT i.id,m.id FROM portal.invoices i JOIN portal.memberships m ON m.family_id=i.family_id
    WHERE i.id=p_invoice AND m.role='parent' AND m.revoked_at IS NULL ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT n.id,m.subject,n.status,
    (n.status IN ('uncertain','sending') AND n.attempt_started_at <= clock_timestamp()-interval '23 hours 55 minutes')
    FROM portal.invoice_notifications n JOIN portal.memberships m ON m.id=n.membership_id
    WHERE n.invoice_id=p_invoice AND m.role='parent' AND m.revoked_at IS NULL ORDER BY n.id;
END $$;
CREATE FUNCTION portal.list_invoice_notifications(p_subject text,p_invoice uuid)
RETURNS TABLE(id uuid, parent_subject text, status text, may_duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT n.id,m.subject,n.status,
    (n.status IN ('uncertain','sending') AND n.attempt_started_at <= clock_timestamp()-interval '23 hours 55 minutes')
  FROM portal.invoice_notifications n JOIN portal.memberships m ON m.id=n.membership_id
  WHERE n.invoice_id=p_invoice AND m.role='parent' AND m.revoked_at IS NULL ORDER BY n.id;
END $$;
CREATE FUNCTION portal.fail_invoice_notification(p_subject text,p_notice uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  UPDATE portal.invoice_notifications n SET status='failed', updated_at=clock_timestamp()
    WHERE n.id=p_notice AND n.status IN ('pending','failed') AND EXISTS (
      SELECT 1 FROM portal.memberships m JOIN portal.invoices i ON i.id=n.invoice_id AND i.family_id=m.family_id
      WHERE m.id=n.membership_id AND m.role='parent' AND m.revoked_at IS NULL AND i.issued_at IS NOT NULL
    );
END $$;
CREATE FUNCTION portal.claim_invoice_notification(p_subject text,p_notice uuid,p_attempt uuid,p_email text,p_sender text,p_origin text,p_accept_duplicate boolean)
RETURNS TABLE(attempt_id uuid, claim_id uuid, recipient_email text, sender text, origin text, invoice_id uuid, family_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE n portal.invoice_notifications%ROWTYPE; fresh boolean;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_attempt IS NULL OR p_accept_duplicate IS NULL OR p_email IS NULL OR length(btrim(p_email)) NOT BETWEEN 1 AND 254 OR p_sender IS NULL OR length(btrim(p_sender)) NOT BETWEEN 1 AND 500 OR p_origin IS NULL OR length(btrim(p_origin)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid notification' USING ERRCODE='22023'; END IF;
  SELECT n1.* INTO n FROM portal.invoice_notifications n1 JOIN portal.invoices i ON i.id=n1.invoice_id
    JOIN portal.memberships m ON m.id=n1.membership_id AND m.family_id=i.family_id
    WHERE n1.id=p_notice AND i.issued_at IS NOT NULL AND m.role='parent' AND m.revoked_at IS NULL FOR UPDATE OF n1, m;
  IF NOT FOUND THEN RAISE EXCEPTION 'notification unavailable' USING ERRCODE='22023'; END IF;
  IF n.status='sent' THEN RAISE EXCEPTION 'notification already sent' USING ERRCODE='22023'; END IF;
  IF n.status='sending' AND n.lease_until > clock_timestamp() THEN RAISE EXCEPTION 'notification in progress' USING ERRCODE='22023'; END IF;
  fresh := n.attempt_started_at IS NULL OR n.attempt_started_at <= clock_timestamp()-interval '23 hours 55 minutes';
  IF fresh AND n.status IN ('uncertain','sending') AND NOT p_accept_duplicate THEN RAISE EXCEPTION 'notification may already have been sent' USING ERRCODE='22023'; END IF;
  IF NOT fresh AND (n.recipient_email IS DISTINCT FROM p_email OR n.sender IS DISTINCT FROM p_sender OR n.origin IS DISTINCT FROM p_origin) THEN RAISE EXCEPTION 'notification recipient or configuration changed' USING ERRCODE='22023'; END IF;
  UPDATE portal.invoice_notifications n1 SET
    attempt_id=CASE WHEN fresh THEN p_attempt ELSE n.attempt_id END,
    attempt_started_at=CASE WHEN fresh THEN clock_timestamp() ELSE n.attempt_started_at END,
    recipient_email=CASE WHEN fresh THEN p_email ELSE n.recipient_email END,
    sender=CASE WHEN fresh THEN p_sender ELSE n.sender END,
    origin=CASE WHEN fresh THEN p_origin ELSE n.origin END,
    status='sending', claim_id=gen_random_uuid(), lease_until=clock_timestamp()+interval '1 minute', updated_at=clock_timestamp()
    WHERE n1.id=n.id RETURNING n1.* INTO n;
  RETURN QUERY SELECT n.attempt_id,n.claim_id,n.recipient_email,n.sender,n.origin,n.invoice_id,i.family_id FROM portal.invoices i WHERE i.id=n.invoice_id;
END $$;
CREATE FUNCTION portal.finish_invoice_notification(p_subject text,p_notice uuid,p_claim uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_status IS NULL OR p_status NOT IN ('sent','failed','uncertain') THEN RAISE EXCEPTION 'invalid notification state' USING ERRCODE='22023'; END IF;
  UPDATE portal.invoice_notifications SET status=p_status, lease_until=NULL, updated_at=clock_timestamp()
    WHERE id=p_notice AND claim_id=p_claim AND status='sending';
  IF NOT FOUND THEN RAISE EXCEPTION 'notification attempt unavailable' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION portal.enqueue_invoice_notifications(), portal.prepare_invoice_notifications(text,uuid), portal.list_invoice_notifications(text,uuid), portal.fail_invoice_notification(text,uuid), portal.claim_invoice_notification(text,uuid,uuid,text,text,text,boolean), portal.finish_invoice_notification(text,uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION portal.snapshot_invoice_contact(), portal.save_billing_settings_with_contact(text,text,text,text,boolean,integer,text,integer,text,text,date), portal.list_admin_invoices(text) FROM PUBLIC;
COMMIT;
