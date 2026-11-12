-- Forward-only. All identity arguments must come from a verified server session.
BEGIN;
CREATE TABLE portal.billing_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  issuer_name text NOT NULL CHECK (length(btrim(issuer_name)) BETWEEN 1 AND 200),
  issuer_address text NOT NULL CHECK (length(btrim(issuer_address)) BETWEEN 1 AND 1000),
  vat_enabled boolean NOT NULL,
  vat_rate_basis_points integer CHECK (vat_rate_basis_points BETWEEN 0 AND 10000),
  vat_registration text CHECK (vat_registration IS NULL OR length(btrim(vat_registration)) BETWEEN 1 AND 100),
  payment_terms_days integer CHECK (payment_terms_days BETWEEN 0 AND 3650),
  payment_method text CHECK (payment_method IS NULL OR length(btrim(payment_method)) BETWEEN 1 AND 1000),
  billing_cadence text CHECK (billing_cadence IN ('weekly', 'monthly')),
  founding_transition_date date CHECK (founding_transition_date IS NULL OR isfinite(founding_transition_date)),
  CHECK (NOT vat_enabled OR (vat_rate_basis_points IS NOT NULL AND vat_registration IS NOT NULL))
);
INSERT INTO portal.billing_settings(issuer_name, issuer_address, vat_enabled) VALUES ('Goldleaf Learning Ltd', '51 Hurst rd', false);
CREATE TABLE portal.invoice_number_counter (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), last_number bigint NOT NULL DEFAULT 0 CHECK (last_number >= 0));
INSERT INTO portal.invoice_number_counter DEFAULT VALUES;
CREATE TABLE portal.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES portal.families(id),
  recipient_name text NOT NULL CHECK (length(btrim(recipient_name)) BETWEEN 1 AND 200),
  recipient_address text NOT NULL CHECK (length(btrim(recipient_address)) BETWEEN 1 AND 1000),
  created_by uuid NOT NULL REFERENCES portal.memberships(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  invoice_number bigint UNIQUE,
  issued_at timestamptz,
  issued_by uuid REFERENCES portal.memberships(id),
  snapshot jsonb,
  CHECK ((invoice_number IS NULL AND issued_at IS NULL AND issued_by IS NULL AND snapshot IS NULL) OR (invoice_number IS NOT NULL AND issued_at IS NOT NULL AND issued_by IS NOT NULL AND snapshot IS NOT NULL))
);
CREATE INDEX invoices_family_issued ON portal.invoices(family_id, issued_at) WHERE issued_at IS NOT NULL;
CREATE TABLE portal.invoice_lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES portal.invoices(id),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 500),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  unit_amount_pence integer NOT NULL CHECK (unit_amount_pence >= 0),
  service_date date NOT NULL CHECK (isfinite(service_date)),
  rate_tier text NOT NULL CHECK (rate_tier IN ('standard', 'founding', 'founding-post-intro')),
  hourly_rate_pence integer NOT NULL CHECK (hourly_rate_pence >= 0),
  days integer NOT NULL CHECK (days BETWEEN 1 AND 5),
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  session_minutes integer NOT NULL CHECK (session_minutes > 0),
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  CHECK (quantity::bigint * unit_amount_pence <= 2147483647)
);
CREATE INDEX invoice_lines_invoice ON portal.invoice_lines(invoice_id);
CREATE TABLE portal.invoice_payments (
  operation_id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES portal.invoices(id),
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  paid_on date NOT NULL CHECK (isfinite(paid_on)),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 500),
  recorded_by uuid NOT NULL REFERENCES portal.memberships(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX invoice_payments_invoice ON portal.invoice_payments(invoice_id);
REVOKE ALL ON portal.billing_settings, portal.invoice_number_counter, portal.invoices, portal.invoice_lines, portal.invoice_payments FROM PUBLIC;
REVOKE ALL ON SEQUENCE portal.invoice_lines_id_seq FROM PUBLIC;

-- Issued records are append-only even for accidental owner-side edits.
CREATE FUNCTION portal.guard_issued_invoice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL THEN RAISE EXCEPTION 'issued invoice is immutable' USING ERRCODE = '55000'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER issued_invoice_immutable BEFORE UPDATE OR DELETE ON portal.invoices
  FOR EACH ROW EXECUTE FUNCTION portal.guard_issued_invoice();
CREATE FUNCTION portal.guard_issued_invoice_line() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE target uuid; issued timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN target := NEW.invoice_id; ELSE target := OLD.invoice_id; END IF;
  SELECT issued_at INTO issued FROM portal.invoices WHERE id = target FOR SHARE;
  IF issued IS NOT NULL THEN RAISE EXCEPTION 'issued invoice line is immutable' USING ERRCODE = '55000'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.invoice_id <> OLD.invoice_id THEN RAISE EXCEPTION 'invoice line cannot move' USING ERRCODE = '55000'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER issued_invoice_line_immutable BEFORE INSERT OR UPDATE OR DELETE ON portal.invoice_lines
  FOR EACH ROW EXECUTE FUNCTION portal.guard_issued_invoice_line();
CREATE FUNCTION portal.guard_invoice_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'recorded payment is immutable' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER invoice_payment_immutable BEFORE UPDATE OR DELETE ON portal.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION portal.guard_invoice_payment();
CREATE FUNCTION portal.save_billing_settings(p_subject text, p_name text, p_address text, p_vat boolean, p_vat_rate integer, p_vat_registration text, p_terms integer, p_method text, p_cadence text, p_transition date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  UPDATE portal.billing_settings SET issuer_name = btrim(p_name), issuer_address = btrim(p_address), vat_enabled = p_vat,
    vat_rate_basis_points = p_vat_rate, vat_registration = NULLIF(btrim(p_vat_registration), ''), payment_terms_days = p_terms,
    payment_method = NULLIF(btrim(p_method), ''), billing_cadence = p_cadence, founding_transition_date = p_transition;
END $$;
CREATE FUNCTION portal.create_invoice_draft(p_subject text, p_family uuid, p_name text, p_address text, p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; result uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid invoice lines' USING ERRCODE = '22023'; END IF;
  INSERT INTO portal.invoices(family_id, recipient_name, recipient_address, created_by) VALUES (p_family, btrim(p_name), btrim(p_address), actor) RETURNING id INTO result;
  INSERT INTO portal.invoice_lines(invoice_id, description, quantity, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, days, cadence, session_minutes, discount_percent)
  SELECT result, x.description, x.quantity, x.unit_amount_pence, x.service_date, x.rate_tier, x.hourly_rate_pence, x.days, x.cadence, x.session_minutes, x.discount_percent
  FROM jsonb_to_recordset(p_lines) AS x(description text, quantity integer, unit_amount_pence integer, service_date date, rate_tier text, hourly_rate_pence integer, days integer, cadence text, session_minutes integer, discount_percent integer);
  RETURN result;
END $$;
CREATE FUNCTION portal.issue_invoice(p_subject text, p_invoice uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE inv portal.invoices%ROWTYPE; settings portal.billing_settings%ROWTYPE; number bigint; lines jsonb; net numeric; tax numeric; actor uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  SELECT * INTO inv FROM portal.invoices WHERE id = p_invoice FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice not found' USING ERRCODE = '22023'; END IF;
  IF inv.invoice_number IS NOT NULL THEN RETURN inv.invoice_number; END IF;
  SELECT * INTO settings FROM portal.billing_settings FOR SHARE;
  IF settings.payment_terms_days IS NULL OR settings.payment_method IS NULL OR settings.billing_cadence IS NULL OR
    (EXISTS (SELECT 1 FROM portal.invoice_lines WHERE invoice_id = inv.id AND rate_tier <> 'standard') AND settings.founding_transition_date IS NULL) THEN
    RAISE EXCEPTION 'billing policy incomplete' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM portal.invoice_lines WHERE invoice_id = inv.id AND
    (cadence <> settings.billing_cadence OR (rate_tier = 'founding' AND service_date >= settings.founding_transition_date) OR
    (rate_tier = 'founding-post-intro' AND service_date < settings.founding_transition_date))) THEN
    RAISE EXCEPTION 'invoice line conflicts with billing policy' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_agg(to_jsonb(l) || jsonb_build_object('net_pence', l.quantity::bigint * l.unit_amount_pence,
      'vat_pence', CASE WHEN settings.vat_enabled THEN round((l.quantity::numeric * l.unit_amount_pence * settings.vat_rate_basis_points) / 10000) ELSE 0 END) ORDER BY l.id),
    sum(l.quantity::numeric * l.unit_amount_pence),
    sum(CASE WHEN settings.vat_enabled THEN round((l.quantity::numeric * l.unit_amount_pence * settings.vat_rate_basis_points) / 10000) ELSE 0 END)
    INTO lines, net, tax FROM portal.invoice_lines l WHERE l.invoice_id = inv.id;
  IF lines IS NULL OR net + tax > 2147483647 THEN RAISE EXCEPTION 'invalid invoice total' USING ERRCODE = '22023'; END IF;
  UPDATE portal.invoice_number_counter SET last_number = last_number + 1 RETURNING last_number INTO number;
  UPDATE portal.invoices SET invoice_number = number, issued_at = clock_timestamp(), issued_by = actor, snapshot = jsonb_build_object(
    'number', number, 'issuer_name', settings.issuer_name, 'issuer_address', settings.issuer_address,
    'recipient_name', inv.recipient_name, 'recipient_address', inv.recipient_address,
    'issue_date', current_date, 'due_date', current_date + settings.payment_terms_days,
    'payment_terms_days', settings.payment_terms_days, 'payment_method', settings.payment_method,
    'billing_cadence', settings.billing_cadence, 'founding_transition_date', settings.founding_transition_date,
    'vat_enabled', settings.vat_enabled, 'vat_rate_basis_points', settings.vat_rate_basis_points,
    'vat_registration', settings.vat_registration, 'currency', 'GBP', 'lines', lines,
    'net_pence', net, 'vat_pence', tax, 'total_pence', net + tax) WHERE id = inv.id;
  RETURN number;
END $$;
CREATE FUNCTION portal.record_invoice_payment(p_subject text, p_invoice uuid, p_operation uuid, p_amount integer, p_paid_on date, p_reference text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; inv portal.invoices%ROWTYPE; existing portal.invoice_payments%ROWTYPE; paid bigint;
BEGIN
  actor := portal.require_admin(p_subject);
  SELECT * INTO inv FROM portal.invoices WHERE id = p_invoice FOR UPDATE;
  IF NOT FOUND OR inv.issued_at IS NULL THEN RAISE EXCEPTION 'issued invoice required' USING ERRCODE = '22023'; END IF;
  SELECT * INTO existing FROM portal.invoice_payments WHERE operation_id = p_operation;
  IF FOUND THEN
    IF existing.invoice_id IS DISTINCT FROM p_invoice OR existing.amount_pence IS DISTINCT FROM p_amount OR existing.paid_on IS DISTINCT FROM p_paid_on OR existing.reference IS DISTINCT FROM p_reference THEN RAISE EXCEPTION 'payment operation conflict' USING ERRCODE = '22023'; END IF;
    RETURN;
  END IF;
  SELECT COALESCE(sum(amount_pence), 0) INTO paid FROM portal.invoice_payments WHERE invoice_id = p_invoice;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount::bigint + paid > (inv.snapshot->>'total_pence')::bigint THEN RAISE EXCEPTION 'invalid payment amount' USING ERRCODE = '22023'; END IF;
  INSERT INTO portal.invoice_payments(operation_id, invoice_id, amount_pence, paid_on, reference, recorded_by) VALUES (p_operation, p_invoice, p_amount, p_paid_on, p_reference, actor);
END $$;
CREATE FUNCTION portal.read_billing_settings(p_subject text) RETURNS SETOF portal.billing_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT * FROM portal.billing_settings;
END $$;
CREATE FUNCTION portal.read_admin_invoice(p_subject text, p_invoice uuid) RETURNS TABLE (id uuid, family_id uuid, recipient_name text, recipient_address text, invoice_number bigint, snapshot jsonb, lines jsonb, paid_pence bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN QUERY SELECT i.id, i.family_id, i.recipient_name, i.recipient_address, i.invoice_number, i.snapshot,
    (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM portal.invoice_lines l WHERE l.invoice_id = i.id),
    COALESCE((SELECT sum(p.amount_pence) FROM portal.invoice_payments p WHERE p.invoice_id = i.id), 0)::bigint
  FROM portal.invoices i WHERE i.id = p_invoice;
END $$;
CREATE FUNCTION portal.read_family_invoices(p_subject text, p_family uuid) RETURNS TABLE (id uuid, snapshot jsonb, paid_pence bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
 SELECT i.id, i.snapshot, COALESCE((SELECT sum(p.amount_pence) FROM portal.invoice_payments p WHERE p.invoice_id = i.id), 0)::bigint
 FROM portal.invoices i WHERE i.family_id = p_family AND i.issued_at IS NOT NULL
 AND EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject = p_subject AND m.role = 'parent' AND m.family_id = i.family_id AND m.revoked_at IS NULL);
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA portal FROM PUBLIC;
COMMIT;
