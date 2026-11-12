\set ON_ERROR_STOP on
BEGIN;
INSERT INTO portal.memberships(subject, role) VALUES ('staff-admin', 'admin');
SELECT portal.create_family('staff-admin', 'Staff family') AS family \gset
SELECT portal.create_family('staff-admin', 'Other family') AS other_family \gset
SELECT portal.issue_staff_invitation('staff-admin', 'staff@example.com', decode(repeat('a1',32),'hex'), now()+interval '1 day');
SELECT portal.issue_invitation('staff-admin', :'family', 'parent@example.com', decode(repeat('a2',32),'hex'), now()+interval '1 day');
DO $$ BEGIN
  BEGIN PERFORM portal.accept_invitation('bad', 'staff@example.com', decode(repeat('a1',32),'hex')); RAISE EXCEPTION 'staff token accepted as parent'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_staff_invitation('bad', 'parent@example.com', decode(repeat('a2',32),'hex')); RAISE EXCEPTION 'parent token accepted as staff'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_staff_invitation('bad', 'wrong@example.com', decode(repeat('a1',32),'hex')); RAISE EXCEPTION 'wrong email accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DO $$ BEGIN
  BEGIN PERFORM portal.issue_staff_invitation('staff-admin', 'other@example.com', decode(repeat('a2',32),'hex'), now()+interval '1 day'); RAISE EXCEPTION 'duplicate parent digest accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM portal.issue_invitation('staff-admin', (SELECT id FROM portal.families WHERE display_name='Staff family'), 'other@example.com', decode(repeat('a1',32),'hex'), now()+interval '1 day'); RAISE EXCEPTION 'duplicate staff digest accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT portal.issue_staff_invitation('staff-admin', 'revoked@example.com', decode(repeat('b1',32),'hex'), now()+interval '1 day') AS revoked_invite \gset
SELECT portal.revoke_staff_invitation('staff-admin', :'revoked_invite');
SELECT portal.issue_staff_invitation('staff-admin', 'resend@example.com', decode(repeat('b2',32),'hex'), now()+interval '1 day');
SELECT portal.issue_staff_invitation('staff-admin', 'RESEND@example.com', decode(repeat('b3',32),'hex'), now()+interval '1 day');
DO $$ BEGIN
  BEGIN PERFORM portal.accept_staff_invitation('revoked','revoked@example.com',decode(repeat('b1',32),'hex')); RAISE EXCEPTION 'revoked invite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.accept_staff_invitation('resend','resend@example.com',decode(repeat('b2',32),'hex')); RAISE EXCEPTION 'superseded invite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.issue_staff_invitation('staff-admin', 'expired@example.com', decode(repeat('b4',32),'hex'), now()+interval '1 second');
UPDATE portal.staff_invitations SET expires_at = created_at + interval '1 microsecond' WHERE token_digest = decode(repeat('b4',32),'hex');
SELECT pg_sleep(0.01);
DO $$ BEGIN
  BEGIN PERFORM portal.accept_staff_invitation('expired','expired@example.com',decode(repeat('b4',32),'hex')); RAISE EXCEPTION 'expired invite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.accept_staff_invitation('staff', 'STAFF@example.com', decode(repeat('a1',32),'hex')) AS staff \gset
DO $$ BEGIN
  BEGIN PERFORM portal.accept_staff_invitation('staff', 'staff@example.com', decode(repeat('a1',32),'hex')); RAISE EXCEPTION 'replay accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM portal.assigned_family_ids('staff')) OR EXISTS (SELECT 1 FROM portal.memberships WHERE subject='staff' AND role='admin') THEN RAISE EXCEPTION 'unexpected scope or role'; END IF;
END $$;
SELECT portal.set_staff_family_access('staff-admin', :'staff', :'family', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM portal.assigned_family_ids('staff')) <> 1 OR EXISTS (SELECT 1 FROM portal.assigned_family_ids('foreign')) THEN RAISE EXCEPTION 'assignment isolation failed'; END IF;
  BEGIN PERFORM portal.set_staff_family_access('staff', (SELECT id FROM portal.memberships WHERE subject='staff'), gen_random_uuid(), true); RAISE EXCEPTION 'staff assigned access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.issue_staff_invitation('staff-admin', 'alternate@example.com', decode(repeat('a3',32),'hex'), now()+interval '1 day');
SELECT portal.revoke_membership('staff-admin', :'staff');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.assigned_family_ids('staff')) THEN RAISE EXCEPTION 'suspended staff access'; END IF;
  BEGIN PERFORM portal.accept_staff_invitation('staff', 'alternate@example.com', decode(repeat('a3',32),'hex')); RAISE EXCEPTION 'stale invite accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.issue_staff_invitation('staff-admin', 'staff@example.com', decode(repeat('a4',32),'hex'), now()+interval '1 day');
SELECT portal.accept_staff_invitation('staff', 'staff@example.com', decode(repeat('a4',32),'hex'));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.assigned_family_ids('staff')) THEN RAISE EXCEPTION 'revoked assignment restored'; END IF;
  BEGIN PERFORM portal.accept_staff_invitation('staff', 'alternate@example.com', decode(repeat('a3',32),'hex')); RAISE EXCEPTION 'stale invite accepted after reactivation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.set_staff_family_access('staff-admin', :'staff', :'family', true);
SELECT portal.set_staff_family_access('staff-admin', :'staff', :'family', false);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.assigned_family_ids('staff')) OR (SELECT count(*) FROM portal.staff_assignment_history) <> 4 THEN RAISE EXCEPTION 'assignment revocation or audit failed'; END IF;
  IF has_table_privilege('public','portal.staff_invitations','SELECT') OR has_function_privilege('public','portal.accept_staff_invitation(text,text,bytea)','EXECUTE') THEN RAISE EXCEPTION 'public access'; END IF;
END $$;
ROLLBACK;
