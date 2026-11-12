\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships (subject, role) VALUES ('admin', 'admin');
SELECT portal.create_family('admin', 'Test family') AS family \gset
SELECT portal.issue_invitation('admin', :'family', 'parent@example.com', decode(repeat('01', 32), 'hex'), now() + interval '1 day');
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('parent', 'wrong@example.com', decode(repeat('01', 32), 'hex'));
    RAISE EXCEPTION 'wrong email accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.accept_invitation('parent', 'parent@example.com', decode(repeat('01', 32), 'hex'));
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('other', 'parent@example.com', decode(repeat('01', 32), 'hex'));
    RAISE EXCEPTION 'replay accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM portal.create_family('parent', 'Test family');
    RAISE EXCEPTION 'parent created family';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Invites issued before revocation stay invalid even when timestamps move backwards or tie.
SELECT portal.issue_invitation('admin', :'family', 'parent@example.com', decode(repeat('02', 32), 'hex'), now() + interval '1 day');
SELECT portal.issue_invitation('admin', :'family', 'alternate@example.com', decode(repeat('05', 32), 'hex'), now() + interval '1 day');
UPDATE portal.invitations SET created_at = now() + interval '1 hour' WHERE token_digest = decode(repeat('02', 32), 'hex');
SELECT portal.revoke_membership('admin', (SELECT id FROM portal.memberships WHERE subject = 'parent'));
UPDATE portal.invitations SET created_at = (SELECT revoked_at FROM portal.memberships WHERE subject = 'parent') WHERE token_digest = decode(repeat('05', 32), 'hex');
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('parent', 'parent@example.com', decode(repeat('02', 32), 'hex'));
    RAISE EXCEPTION 'old future-dated invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM portal.accept_invitation('parent', 'alternate@example.com', decode(repeat('05', 32), 'hex'));
    RAISE EXCEPTION 'old tied invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.issue_invitation('admin', :'family', 'parent@example.com', decode(repeat('03', 32), 'hex'), now() + interval '1 day');
UPDATE portal.invitations SET created_at = now() - interval '1 day' WHERE token_digest = decode(repeat('03', 32), 'hex');
SELECT portal.accept_invitation('parent', 'PARENT@example.com', decode(repeat('03', 32), 'hex'));
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('parent', 'alternate@example.com', decode(repeat('05', 32), 'hex'));
    RAISE EXCEPTION 'old invitation accepted after reactivation';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Explicit revocation and resending invalidate their previous tokens.
SELECT portal.issue_invitation('admin', :'family', 'revoked@example.com', decode(repeat('06', 32), 'hex'), now() + interval '1 day') AS revoked_invitation \gset
SELECT portal.revoke_invitation('admin', :'revoked_invitation');
SELECT portal.issue_invitation('admin', :'family', 'resend@example.com', decode(repeat('07', 32), 'hex'), now() + interval '1 day');
SELECT portal.issue_invitation('admin', :'family', 'RESEND@example.com', decode(repeat('08', 32), 'hex'), now() + interval '1 day');
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('revoked', 'revoked@example.com', decode(repeat('06', 32), 'hex'));
    RAISE EXCEPTION 'explicitly revoked invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM portal.accept_invitation('resend', 'resend@example.com', decode(repeat('07', 32), 'hex'));
    RAISE EXCEPTION 'superseded invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.accept_invitation('resend', 'resend@example.com', decode(repeat('08', 32), 'hex'));
SELECT portal.issue_invitation('admin', :'family', 'expired@example.com', decode(repeat('04', 32), 'hex'), now() + interval '1 second');
UPDATE portal.invitations SET expires_at = created_at + interval '1 microsecond' WHERE token_digest = decode(repeat('04', 32), 'hex');
SELECT pg_sleep(0.01);
DO $$ BEGIN
  BEGIN
    PERFORM portal.accept_invitation('expired', 'expired@example.com', decode(repeat('04', 32), 'hex'));
    RAISE EXCEPTION 'expired invitation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.active_memberships('parent') WHERE role = 'parent') <> 1 THEN RAISE EXCEPTION 'missing active membership'; END IF;
  IF EXISTS (SELECT 1 FROM portal.active_memberships('unknown')) THEN RAISE EXCEPTION 'cross-subject access'; END IF;
END $$;
SELECT portal.revoke_membership('admin', (SELECT id FROM portal.family_memberships('admin', :'family') WHERE subject = 'parent'));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.active_memberships('parent')) THEN RAISE EXCEPTION 'revoked membership visible'; END IF;
END $$;
SELECT portal.set_founding('admin', :'family', true);
SELECT portal.set_founding('admin', :'family', true);
SELECT portal.set_founding('admin', :'family', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.founding_history) <> 2 THEN RAISE EXCEPTION 'history not idempotent'; END IF;
  IF has_schema_privilege('public', 'portal', 'USAGE') THEN RAISE EXCEPTION 'public schema access'; END IF;
  IF has_function_privilege('public', 'portal.create_family(text,text,uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'public function access'; END IF;
END $$;
DO $$
DECLARE i integer; new_family uuid := gen_random_uuid();
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM portal.set_founding('admin', portal.create_family('admin', 'Capacity fixture'), true);
  END LOOP;
  BEGIN
    PERFORM portal.create_family('admin', 'Must roll back', new_family);
    PERFORM portal.issue_invitation('admin', new_family, 'atomic@example.com', decode(repeat('fe', 32), 'hex'), now() + interval '1 day');
    PERFORM portal.set_founding('admin', new_family, true);
    RAISE EXCEPTION 'capacity failure missing';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'founding capacity reached' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM portal.families WHERE id = new_family)
     OR EXISTS (SELECT 1 FROM portal.invitations WHERE family_id = new_family)
     OR EXISTS (SELECT 1 FROM portal.founding_history WHERE family_id = new_family)
     OR (SELECT remaining FROM public_offer.founding_availability) <> 0 THEN
    RAISE EXCEPTION 'capacity failure did not roll back';
  END IF;
END $$;
ROLLBACK;
