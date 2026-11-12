-- Forward-only. Identity comes only from the verified server boundary.
BEGIN;
CREATE FUNCTION portal.read_scoped_session(p_subject text,p_session uuid)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text,child_name text,family_name text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
  SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label,c.display_name,f.display_name
  FROM portal.sessions s
  JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
  JOIN portal.families f ON f.id=s.family_id
  WHERE s.id=p_session AND EXISTS(SELECT 1 FROM portal.read_family(p_subject,s.family_id));
$$;
CREATE FUNCTION portal.list_staff_sessions(p_subject text)
RETURNS TABLE(id uuid,child_id uuid,family_id uuid,starts_at timestamptz,duration_minutes integer,status text,attendance text,location_label text,child_name text,family_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,portal,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.memberships m WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL) THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT s.id,s.child_id,s.family_id,s.starts_at,s.duration_minutes,s.status,s.attendance,s.location_label,c.display_name,f.display_name
  FROM portal.memberships m
  JOIN portal.staff_family_assignments a ON a.staff_id=m.id
  JOIN portal.sessions s ON s.family_id=a.family_id
  JOIN portal.children c ON c.id=s.child_id AND c.family_id=s.family_id
  JOIN portal.families f ON f.id=s.family_id
  WHERE m.subject=p_subject AND m.role='staff' AND m.revoked_at IS NULL
  ORDER BY s.starts_at,s.id;
END $$;
REVOKE ALL ON FUNCTION portal.read_scoped_session(text,uuid),portal.list_staff_sessions(text) FROM PUBLIC;
COMMIT;
