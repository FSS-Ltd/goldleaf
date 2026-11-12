-- Forward-only. Runtime functions accept subjects only from the verified server boundary.
BEGIN;
CREATE TABLE portal.invoice_draft_operations (
  operation_id uuid PRIMARY KEY,
  request jsonb NOT NULL,
  invoice_id uuid REFERENCES portal.invoices(id)
);
REVOKE ALL ON portal.invoice_draft_operations FROM PUBLIC;

-- Caller holds authorisation. Every tag event is included so checked mutations detect changes.
CREATE FUNCTION portal.invoice_pricing_context(p_family uuid, p_dates jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp SET TimeZone = 'UTC' AS $$
DECLARE result jsonb;
BEGIN
  IF jsonb_typeof(p_dates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_dates) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid service dates' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM portal.families WHERE id=p_family) THEN RAISE EXCEPTION 'family not found' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_object(
    'family_id', p_family,
    'settings', (SELECT to_jsonb(s) FROM portal.billing_settings s),
    'slot_assigned', EXISTS (SELECT 1 FROM portal.founding_slots WHERE family_id=p_family),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', h.id::text, 'is_founding', h.is_founding, 'changed_at', h.changed_at) ORDER BY h.id) FROM portal.founding_history h WHERE h.family_id=p_family), '[]'::jsonb),
    'eligibility', (SELECT jsonb_agg(jsonb_build_object('service_date', d.service_date, 'is_founding',
      CASE WHEN latest.id IS NOT NULL THEN latest.is_founding
        WHEN first_event.id IS NOT NULL AND NOT first_event.is_founding THEN NULL
        WHEN first_event.id IS NULL AND EXISTS (SELECT 1 FROM portal.founding_slots WHERE family_id=p_family) THEN NULL
        ELSE false END) ORDER BY d.ordinality)
      FROM (SELECT value::date AS service_date, ordinality FROM jsonb_array_elements_text(p_dates) WITH ORDINALITY) d
      LEFT JOIN LATERAL (SELECT h.id, h.is_founding FROM portal.founding_history h
        WHERE h.family_id=p_family AND h.changed_at < ((d.service_date + 1)::timestamp AT TIME ZONE 'Europe/London') ORDER BY h.id DESC LIMIT 1) latest ON true
      LEFT JOIN LATERAL (SELECT h.id, h.is_founding FROM portal.founding_history h WHERE h.family_id=p_family ORDER BY h.id LIMIT 1) first_event ON true)
  ) INTO result;
  RETURN result;
END $$;
CREATE FUNCTION portal.invoice_draft_context(p_subject text, p_family uuid, p_dates jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
BEGIN
  PERFORM portal.require_admin(p_subject);
  RETURN portal.invoice_pricing_context(p_family, p_dates);
END $$;
CREATE FUNCTION portal.invoice_issue_context(p_subject text, p_invoice uuid) RETURNS jsonb
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
      'discount_percent', l.discount_percent) ORDER BY l.id) AS lines,
      jsonb_agg(l.service_date ORDER BY l.id) AS dates
    FROM portal.invoice_lines l WHERE l.invoice_id=inv.id
  ) entries WHERE inv.id=p_invoice;
  IF result IS NULL THEN RAISE EXCEPTION 'invoice not found' USING ERRCODE='22023'; END IF;
  RETURN result;
END $$;
CREATE FUNCTION portal.read_invoice_draft_operation(p_subject text, p_operation uuid, p_request jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE operation portal.invoice_draft_operations%ROWTYPE;
BEGIN
  PERFORM portal.require_admin(p_subject);
  SELECT * INTO operation FROM portal.invoice_draft_operations WHERE operation_id=p_operation;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF operation.request IS DISTINCT FROM p_request THEN RAISE EXCEPTION 'draft operation conflict' USING ERRCODE='22023'; END IF;
  RETURN operation.invoice_id;
END $$;
CREATE FUNCTION portal.create_invoice_draft_checked(p_subject text, p_operation uuid, p_request jsonb, p_expected jsonb, p_lines jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp AS $$
DECLARE operation portal.invoice_draft_operations%ROWTYPE; family uuid; actual jsonb; result uuid;
BEGIN
  PERFORM portal.require_admin(p_subject);
  IF p_operation IS NULL OR p_request IS NULL THEN RAISE EXCEPTION 'invalid draft operation' USING ERRCODE='22023'; END IF;
  INSERT INTO portal.invoice_draft_operations(operation_id, request) VALUES(p_operation, p_request) ON CONFLICT DO NOTHING;
  SELECT * INTO operation FROM portal.invoice_draft_operations WHERE operation_id=p_operation FOR UPDATE;
  IF operation.request IS DISTINCT FROM p_request THEN RAISE EXCEPTION 'draft operation conflict' USING ERRCODE='22023'; END IF;
  IF operation.invoice_id IS NOT NULL THEN RETURN operation.invoice_id; END IF;
  family := (p_request->>'familyId')::uuid;
  PERFORM 1 FROM portal.families WHERE id=family FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'family not found' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM portal.billing_settings FOR SHARE;
  SELECT portal.invoice_pricing_context(family, (SELECT jsonb_agg(line->>'serviceDate' ORDER BY ord) FROM jsonb_array_elements(p_request->'lines') WITH ORDINALITY x(line,ord))) INTO actual;
  IF actual IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'invoice context changed' USING ERRCODE='40001'; END IF;
  result := portal.create_invoice_draft(p_subject, family, p_request->>'recipientName', p_request->>'recipientAddress', p_lines);
  UPDATE portal.invoice_draft_operations SET invoice_id=result WHERE operation_id=p_operation;
  RETURN result;
END $$;
CREATE FUNCTION portal.issue_invoice_checked(p_subject text, p_invoice uuid, p_expected jsonb) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, portal, pg_temp SET TimeZone = 'Europe/London' AS $$
DECLARE inv portal.invoices%ROWTYPE; actual jsonb;
BEGIN
  PERFORM portal.require_admin(p_subject);
  SELECT * INTO inv FROM portal.invoices WHERE id=p_invoice FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice not found' USING ERRCODE='22023'; END IF;
  IF inv.invoice_number IS NOT NULL THEN RETURN inv.invoice_number; END IF;
  PERFORM 1 FROM portal.families WHERE id=inv.family_id FOR UPDATE;
  PERFORM 1 FROM portal.billing_settings FOR SHARE;
  actual := portal.invoice_issue_context(p_subject, p_invoice);
  IF actual IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'invoice context changed' USING ERRCODE='40001'; END IF;
  RETURN portal.issue_invoice(p_subject,p_invoice);
END $$;
REVOKE ALL ON FUNCTION portal.invoice_pricing_context(uuid,jsonb), portal.invoice_draft_context(text,uuid,jsonb), portal.invoice_issue_context(text,uuid), portal.read_invoice_draft_operation(text,uuid,jsonb), portal.create_invoice_draft_checked(text,uuid,jsonb,jsonb,jsonb), portal.issue_invoice_checked(text,uuid,jsonb) FROM PUBLIC;
COMMIT;
