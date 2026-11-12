\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE goldleaf_delivery_test NOLOGIN;
GRANT USAGE ON SCHEMA portal TO goldleaf_delivery_test;
GRANT EXECUTE ON FUNCTION portal.list_family_invitations(text, uuid), portal.invitation_delivery_recipient(text, uuid, bytea), portal.mark_invitation_delivery(text, uuid, text), portal.issue_invitation(text, uuid, text, bytea, timestamptz), portal.revoke_invitation(text, uuid), portal.issue_parent_delivery(text, uuid, text, bytea, timestamptz, uuid) TO goldleaf_delivery_test;
INSERT INTO portal.memberships(subject, role) VALUES ('delivery-admin', 'admin');
SELECT portal.create_family('delivery-admin', 'Delivery family', '30000000-0000-0000-0000-000000000001');
SELECT portal.issue_invitation('delivery-admin', '30000000-0000-0000-0000-000000000001', 'recipient@example.com', decode(repeat('21', 32), 'hex'), now() + interval '7 days') AS invitation \gset
SET LOCAL ROLE goldleaf_delivery_test;
DO $$ BEGIN
  BEGIN PERFORM portal.list_family_invitations('parent', '30000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'parent listed invitations'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM portal.invitation_delivery_recipient('parent', (SELECT id FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001')), decode(repeat('21', 32), 'hex')); RAISE EXCEPTION 'parent accessed recipient'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF EXISTS (SELECT 1 FROM portal.invitation_delivery_recipient('delivery-admin', (SELECT id FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001')), decode(repeat('22', 32), 'hex'))) THEN RAISE EXCEPTION 'wrong token returned recipient'; END IF;
  BEGIN PERFORM portal.mark_invitation_delivery('parent', (SELECT id FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001')), 'sent'); RAISE EXCEPTION 'parent changed delivery'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT portal.mark_invitation_delivery('delivery-admin', :'invitation', 'sent');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001') WHERE delivery_status = 'sent' AND active) THEN RAISE EXCEPTION 'delivery status missing'; END IF;
  IF EXISTS (SELECT 1 FROM portal.invitation_delivery_recipient('delivery-admin', (SELECT id FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001')), decode(repeat('21', 32), 'hex'))) THEN RAISE EXCEPTION 'sent invite available for duplicate send'; END IF;
END $$;
SELECT portal.issue_parent_delivery('delivery-admin', '30000000-0000-0000-0000-000000000001', 'recipient@example.com', decode(repeat('23', 32), 'hex'), now() + interval '7 days', '40000000-0000-4000-8000-000000000001') AS replacement \gset
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001') WHERE email = 'recipient@example.com' AND delivery_status = 'sent' AND active) THEN RAISE EXCEPTION 'resend did not invalidate old invite'; END IF;
  BEGIN PERFORM portal.issue_parent_delivery('delivery-admin', '30000000-0000-0000-0000-000000000001', 'recipient@example.com', decode(repeat('24', 32), 'hex'), now() + interval '7 days', '40000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'replayed resend accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
  IF (SELECT count(*) FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001')) <> 2 THEN RAISE EXCEPTION 'replayed resend created an invitation'; END IF;
END $$;
SELECT portal.mark_invitation_delivery('delivery-admin', :'replacement', 'failed');
SELECT portal.revoke_invitation('delivery-admin', :'replacement');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM portal.list_family_invitations('delivery-admin', '30000000-0000-0000-0000-000000000001') WHERE delivery_status = 'failed' AND NOT active) THEN RAISE EXCEPTION 'failed revoked delivery not visible'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
