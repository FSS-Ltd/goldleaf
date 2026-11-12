\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE goldleaf_access_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO goldleaf_access_test;
GRANT EXECUTE ON FUNCTION portal.active_memberships(text), portal.create_family(text, text, uuid), portal.issue_invitation(text, uuid, text, bytea, timestamptz), portal.set_founding(text, uuid, boolean), portal.family_memberships(text, uuid), portal.list_families(text), portal.read_family(text, uuid), portal.list_staff(text), portal.accept_verified_invitation(text, text[], bytea, text) TO goldleaf_access_test;
INSERT INTO portal.memberships (subject, role) VALUES ('test-admin', 'admin');
SELECT portal.create_family('test-admin', 'Family A', '10000000-0000-0000-0000-000000000001');
SELECT portal.create_family('test-admin', 'Family B', '10000000-0000-0000-0000-000000000002');
SELECT portal.issue_invitation('test-admin', '10000000-0000-0000-0000-000000000001', 'verified@example.com', decode(repeat('11', 32), 'hex'), now() + interval '7 days');
SELECT portal.issue_staff_invitation('test-admin', 'staff@example.com', decode(repeat('13', 32), 'hex'), now() + interval '7 days');
SET LOCAL ROLE goldleaf_access_test;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.active_memberships('missing')) OR EXISTS (SELECT 1 FROM portal.read_family('missing', '10000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'missing identity has access'; END IF;
  BEGIN PERFORM portal.list_families('missing'); RAISE EXCEPTION 'missing identity is admin'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_verified_invitation('parent', ARRAY['unverified@example.com'], decode(repeat('11', 32), 'hex'), 'parent'); RAISE EXCEPTION 'wrong email accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM portal.accept_verified_invitation('parent', ARRAY['primary@example.com', 'verified@example.com'], decode(repeat('11', 32), 'hex'), 'parent');
  IF NOT EXISTS (SELECT 1 FROM portal.read_family('parent', '10000000-0000-0000-0000-000000000001')) OR EXISTS (SELECT 1 FROM portal.read_family('parent', '10000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'parent family scope failed'; END IF;
  BEGIN PERFORM portal.list_families('parent'); RAISE EXCEPTION 'parent listed families'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.create_family('test-admin', 'Duplicate', '10000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'duplicate family ID accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM portal.require_admin('test-admin'); RAISE EXCEPTION 'internal function granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_invitation('parent', 'verified@example.com', decode(repeat('11', 32), 'hex')); RAISE EXCEPTION 'internal acceptance granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_staff_invitation('staff', 'staff@example.com', decode(repeat('13', 32), 'hex')); RAISE EXCEPTION 'internal staff acceptance granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM portal.families; RAISE EXCEPTION 'private table granted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM portal.accept_verified_invitation('staff', ARRAY['other@example.com', 'staff@example.com'], decode(repeat('13', 32), 'hex'), 'staff');
  IF EXISTS (SELECT 1 FROM portal.read_family('staff', '10000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'unassigned staff has access'; END IF;
  IF (SELECT count(*) FROM portal.list_families('test-admin')) <> 2 OR (SELECT count(*) FROM portal.list_staff('test-admin')) <> 1 THEN RAISE EXCEPTION 'admin lists failed'; END IF;
END $$;
RESET ROLE;
SELECT portal.set_staff_family_access('test-admin', (SELECT id FROM portal.memberships WHERE subject = 'staff'), '10000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE goldleaf_access_test;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.read_family('staff', '10000000-0000-0000-0000-000000000001')) OR EXISTS (SELECT 1 FROM portal.read_family('staff', '10000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'staff family scope failed'; END IF;
END $$;
RESET ROLE;
SELECT portal.revoke_membership('test-admin', (SELECT id FROM portal.memberships WHERE subject = 'staff'));
SET LOCAL ROLE goldleaf_access_test;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.read_family('staff', '10000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'revoked staff has access'; END IF;
END $$;
RESET ROLE;
SELECT portal.revoke_membership('test-admin', (SELECT id FROM portal.memberships WHERE subject = 'parent'));
SET LOCAL ROLE goldleaf_access_test;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.read_family('parent', '10000000-0000-0000-0000-000000000001')) OR EXISTS (SELECT 1 FROM portal.active_memberships('parent')) THEN RAISE EXCEPTION 'revoked parent has access'; END IF;
END $$;
RESET ROLE;
DO $$ DECLARE i integer; BEGIN
  FOR i IN 1..5 LOOP PERFORM portal.set_founding('test-admin', portal.create_family('test-admin', 'Capacity'), true); END LOOP;
END $$;
SET LOCAL ROLE goldleaf_access_test;
DO $$ BEGIN
  BEGIN
    PERFORM portal.create_family('test-admin', 'Atomic failure', '20000000-0000-0000-0000-000000000001');
    PERFORM portal.issue_invitation('test-admin', '20000000-0000-0000-0000-000000000001', 'atomic@example.com', decode(repeat('12', 32), 'hex'), now() + interval '7 days');
    PERFORM portal.set_founding('test-admin', '20000000-0000-0000-0000-000000000001', true);
    RAISE EXCEPTION 'capacity failure missing';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'founding capacity reached' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.families WHERE id = '20000000-0000-0000-0000-000000000001') OR EXISTS (SELECT 1 FROM portal.invitations WHERE family_id = '20000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'atomic rollback failed'; END IF;
END $$;
ROLLBACK;
