-- Forward-only admin schedule projection; identity is supplied by the trusted server.
BEGIN;
CREATE INDEX sessions_start ON portal.sessions(starts_at,id);
CREATE FUNCTION portal.list_admin_sessions(p_subject text,p_day date)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text,child_name text,family_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='admin' AND m.family_id IS NULL AND m.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label,c.display_name,f.display_name
    FROM portal.sessions s
    JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
    JOIN portal.families f ON f.id=s.family_id
    WHERE s.starts_at >= (p_day::timestamp AT TIME ZONE 'Europe/London')
      AND s.starts_at < ((p_day + 1)::timestamp AT TIME ZONE 'Europe/London')
    ORDER BY s.starts_at,s.id;
END $$;
REVOKE ALL ON FUNCTION portal.list_admin_sessions(text,date) FROM PUBLIC;
COMMIT;
