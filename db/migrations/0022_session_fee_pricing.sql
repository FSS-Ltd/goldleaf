-- Forward-only. Preserve hourly historical lines and existing immutable snapshots.
BEGIN;
ALTER TABLE portal.invoice_lines ALTER COLUMN hourly_rate_pence DROP NOT NULL;
ALTER TABLE portal.invoice_lines ADD COLUMN pricing_basis text NOT NULL DEFAULT 'hourly', ADD COLUMN session_fee_pence integer;
ALTER TABLE portal.invoice_lines ADD CONSTRAINT invoice_line_pricing_basis_check CHECK (
  (pricing_basis = 'hourly' AND hourly_rate_pence IS NOT NULL AND session_fee_pence IS NULL) OR
  (pricing_basis = 'session' AND hourly_rate_pence IS NULL AND session_fee_pence IS NOT NULL AND session_fee_pence >= 0)
);
CREATE OR REPLACE FUNCTION portal.create_invoice_draft(p_subject text, p_family uuid, p_name text, p_address text, p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE actor uuid; result uuid;
BEGIN
  actor := portal.require_admin(p_subject);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid invoice lines' USING ERRCODE = '22023'; END IF;
  INSERT INTO portal.invoices(family_id, recipient_name, recipient_address, created_by) VALUES (p_family, btrim(p_name), btrim(p_address), actor) RETURNING id INTO result;
  INSERT INTO portal.invoice_lines(invoice_id, description, quantity, quantity_basis, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, pricing_basis, session_fee_pence, days, cadence, session_minutes, discount_percent)
  SELECT result, x.description, x.quantity, COALESCE(x.quantity_basis, 'periods'), x.unit_amount_pence, x.service_date, x.rate_tier, x.hourly_rate_pence, COALESCE(x.pricing_basis, 'hourly'), x.session_fee_pence, x.days, x.cadence, x.session_minutes, x.discount_percent
  FROM jsonb_to_recordset(p_lines) AS x(description text, quantity integer, quantity_basis text, unit_amount_pence integer, service_date date, rate_tier text, hourly_rate_pence integer, pricing_basis text, session_fee_pence integer, days integer, cadence text, session_minutes integer, discount_percent integer);
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION portal.invoice_issue_context(p_subject text, p_invoice uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  PERFORM portal.require_admin(p_subject);
  SELECT jsonb_build_object('invoice_id', inv.id, 'invoice_number', inv.invoice_number::text,
    'recipient_name', inv.recipient_name, 'recipient_address', inv.recipient_address, 'pricing', portal.invoice_pricing_context(inv.family_id, entries.dates), 'lines', entries.lines)
  INTO result FROM portal.invoices inv
  CROSS JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', l.id::text, 'invoice_id', l.invoice_id,
      'description', l.description, 'quantity', l.quantity, 'unit_amount_pence', l.unit_amount_pence,
      'service_date', l.service_date, 'rate_tier', l.rate_tier, 'hourly_rate_pence', l.hourly_rate_pence,
      'days', l.days, 'cadence', l.cadence, 'session_minutes', l.session_minutes,
      'discount_percent', l.discount_percent) || CASE WHEN l.pricing_basis = 'session' THEN jsonb_build_object('pricing_basis', l.pricing_basis, 'session_fee_pence', l.session_fee_pence) ELSE '{}'::jsonb END || CASE WHEN l.quantity_basis = 'children' THEN jsonb_build_object('quantity_basis', l.quantity_basis) ELSE '{}'::jsonb END ORDER BY l.id) AS lines,
      jsonb_agg(l.service_date ORDER BY l.id) AS dates
    FROM portal.invoice_lines l WHERE l.invoice_id=inv.id
  ) entries WHERE inv.id=p_invoice;
  IF result IS NULL THEN RAISE EXCEPTION 'invoice not found' USING ERRCODE='22023'; END IF;
  RETURN result;
END $$;
-- A new entry point ensures new writers fail closed against earlier schemas.
CREATE FUNCTION portal.create_invoice_session_draft_checked(p_subject text, p_operation uuid, p_request jsonb, p_expected jsonb, p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 OR
     EXISTS (SELECT 1 FROM jsonb_array_elements(p_lines) line WHERE line->>'pricing_basis' IS DISTINCT FROM 'session' OR
       line->>'hourly_rate_pence' IS NOT NULL OR line->>'session_fee_pence' IS NULL) THEN
    RAISE EXCEPTION 'invalid session pricing' USING ERRCODE='22023';
  END IF;
  RETURN portal.create_invoice_draft_checked(p_subject, p_operation, p_request, p_expected, p_lines);
END $$;
REVOKE ALL ON FUNCTION portal.create_invoice_session_draft_checked(text,uuid,jsonb,jsonb,jsonb) FROM PUBLIC;
COMMIT;
