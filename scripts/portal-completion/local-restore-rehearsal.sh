#!/bin/bash
set -euo pipefail
# Require an already installed image; never pull an image or connect to a host database.
docker image inspect postgres:17-alpine >/dev/null
container=$(docker run -d --rm --pull never --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine)
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
ready=false
for attempt in {1..30}; do
  if docker logs "$container" 2>&1 | grep -q 'PostgreSQL init process complete' && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[ "$ready" = true ] || { printf 'Local PostgreSQL did not become ready\n' >&2; exit 1; }
docker exec "$container" createdb -U postgres source
docker exec "$container" createdb -U postgres restored
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source -c 'CREATE ROLE synthetic_runtime NOLOGIN' >/dev/null
for migration in db/migrations/*.sql; do
  [ "$migration" = db/migrations/0022_session_fee_pricing.sql ] && break
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source < "$migration" >/dev/null
done
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source >/dev/null <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('synthetic-admin','admin');
INSERT INTO portal.families(id,display_name) VALUES ('80000000-0000-0000-0000-000000000001','Synthetic A'),('80000000-0000-0000-0000-000000000002','Synthetic B');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('synthetic-parent','parent','80000000-0000-0000-0000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('synthetic-revoked','parent','80000000-0000-0000-0000-000000000001');
SELECT portal.revoke_membership('synthetic-admin',(SELECT id FROM portal.memberships WHERE subject='synthetic-parent'));
SELECT portal.revoke_membership('synthetic-admin',(SELECT id FROM portal.memberships WHERE subject='synthetic-revoked'));
SELECT portal.issue_invitation('synthetic-admin','80000000-0000-0000-0000-000000000001','parent@example.invalid',decode(repeat('b1',32),'hex'),now()+interval '1 day');
SELECT portal.accept_invitation('synthetic-parent','parent@example.invalid',decode(repeat('b1',32),'hex'));
SELECT portal.save_billing_settings('synthetic-admin','Synthetic issuer','Synthetic address',false,NULL,NULL,14,'Bank','weekly','2027-04-01');
DO $$ DECLARE inv uuid; ctx jsonb; BEGIN
 inv := portal.create_invoice_draft('synthetic-admin','80000000-0000-0000-0000-000000000001','Synthetic parent','Synthetic address','[{"description":"Tuition","quantity":1,"unit_amount_pence":6000,"service_date":"2027-03-27","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]');
 ctx := portal.invoice_issue_context('synthetic-admin',inv);
 PERFORM portal.issue_invoice_checked('synthetic-admin',inv,ctx);
END $$;
SQL
legacy_before=$(docker exec "$container" psql -X -At -U postgres -d source -c "SELECT md5(snapshot::text) FROM portal.invoices WHERE issued_at IS NOT NULL")
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source < db/migrations/0022_session_fee_pricing.sql >/dev/null
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source < db/migrations/0023_message_alerts.sql >/dev/null
legacy_after=$(docker exec "$container" psql -X -At -U postgres -d source -c "SELECT md5(snapshot::text) FROM portal.invoices WHERE issued_at IS NOT NULL")
[ -n "$legacy_before" ] && [ "$legacy_before" = "$legacy_after" ]
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source >/dev/null <<'SQL'
DO $$ DECLARE inv uuid; ctx jsonb; request jsonb := '{"operationId":"80000000-0000-4000-8000-000000000010","quantityIntent":"children-v1","familyId":"80000000-0000-0000-0000-000000000001","recipientName":"Synthetic parent","recipientAddress":"Synthetic address","lines":[{"description":"Session tuition","quantity":1,"days":1,"cadence":"weekly","serviceDate":"2027-03-27"}]}'::jsonb; BEGIN
 ctx := portal.invoice_draft_context('synthetic-admin','80000000-0000-0000-0000-000000000001','["2027-03-27"]');
 inv := portal.create_invoice_session_draft_checked('synthetic-admin','80000000-0000-4000-8000-000000000010',request,ctx,'[{"description":"Session tuition","quantity":1,"quantity_basis":"children","unit_amount_pence":6000,"service_date":"2027-03-27","rate_tier":"standard","pricing_basis":"session","hourly_rate_pence":null,"session_fee_pence":6000,"days":1,"cadence":"weekly","session_minutes":105,"discount_percent":0}]');
 ctx := portal.invoice_issue_context('synthetic-admin',inv);
 PERFORM portal.issue_invoice_checked('synthetic-admin',inv,ctx);
END $$;
SELECT portal.send_family_message('synthetic-admin','80000000-0000-0000-0000-000000000001','80000000-0000-4000-8000-000000000011','Synthetic message');
DO $$ DECLARE d uuid; t uuid; BEGIN
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NULL THEN RAISE EXCEPTION 'alert missing'; END IF;
 PERFORM portal.alert_freeze(d,t,jsonb_build_object('from','sender@example.test','to','recipient@example.test','subject','You have a Goldleaf update','text',E'There is an update in your Goldleaf portal. Sign in to view it:\n\nhttp://localhost/portal'),'synthetic-key');
END $$;
CREATE ROLE synthetic_worker NOLOGIN;
GRANT USAGE ON SCHEMA portal TO synthetic_worker;
GRANT EXECUTE ON FUNCTION portal.alert_claim(integer),portal.alert_next_due(),portal.alert_gate(uuid,uuid),portal.alert_freeze(uuid,uuid,jsonb,text),portal.alert_finish(uuid,uuid,text,timestamptz) TO synthetic_worker;
GRANT USAGE ON SCHEMA portal TO synthetic_runtime;
GRANT EXECUTE ON FUNCTION portal.read_family(text,uuid), portal.read_family_invoices(text,uuid), portal.list_removable_memberships(text,text,uuid), portal.revoke_membership_checked(text,uuid,text,uuid,bigint), portal.message_attention(text,text) TO synthetic_runtime;
SQL
before=$(docker exec "$container" psql -X -At -U postgres -d source -c "SELECT md5(string_agg(id::text || snapshot::text, '' ORDER BY id)) FROM portal.invoices WHERE issued_at IS NOT NULL")
docker exec "$container" pg_dump -U postgres -Fc -d source -f /tmp/backup.dump
docker exec "$container" pg_restore -U postgres --exit-on-error -d restored /tmp/backup.dump
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d restored <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.invoices WHERE issued_at IS NOT NULL AND snapshot IS NOT NULL) <> 2 THEN RAISE EXCEPTION 'issued snapshots missing'; END IF;
 IF (SELECT count(*) FROM portal.alert_events) <> 1 OR (SELECT count(*) FROM portal.alert_deliveries WHERE status='leased' AND idempotency_key='synthetic-key' AND payload->>'to'='recipient@example.test') <> 1 OR (SELECT count(*) FROM portal.alert_paths) <> 1 THEN RAISE EXCEPTION 'alert outbox missing'; END IF;
 IF has_table_privilege('synthetic_worker','portal.alert_deliveries','SELECT') OR NOT has_function_privilege('synthetic_worker','portal.alert_gate(uuid,uuid)','EXECUTE') OR has_function_privilege('public','portal.alert_gate(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'alert grants wrong'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.memberships m JOIN portal.families f ON f.id=m.family_id WHERE m.subject='synthetic-parent' AND f.display_name='Synthetic A') THEN RAISE EXCEPTION 'relationship missing'; END IF;
 IF NOT has_schema_privilege('synthetic_runtime','portal','USAGE') OR NOT has_function_privilege('synthetic_runtime','portal.read_family(text,uuid)','EXECUTE') OR has_table_privilege('synthetic_runtime','portal.families','SELECT') THEN RAISE EXCEPTION 'grants wrong'; END IF;
 IF NOT has_function_privilege('synthetic_runtime','portal.list_removable_memberships(text,text,uuid)','EXECUTE') OR NOT has_function_privilege('synthetic_runtime','portal.revoke_membership_checked(text,uuid,text,uuid,bigint)','EXECUTE') OR has_function_privilege('synthetic_runtime','portal.revoke_membership(text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'membership grants wrong'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.memberships WHERE subject='synthetic-parent' AND revoked_at IS NULL AND access_generation=2) OR NOT EXISTS (SELECT 1 FROM portal.memberships WHERE subject='synthetic-revoked' AND revoked_at IS NOT NULL AND access_generation=1) THEN RAISE EXCEPTION 'membership generation missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.invoices WHERE NOT (snapshot->'lines'->0 ? 'pricing_basis') AND (snapshot->'lines'->0->>'hourly_rate_pence')::integer=3000 AND (snapshot->'lines'->0->>'session_minutes')::integer=120 AND (snapshot->>'total_pence')::integer=6000) OR NOT EXISTS (SELECT 1 FROM portal.invoices WHERE snapshot->'lines'->0->>'pricing_basis'='session' AND (snapshot->'lines'->0->>'session_fee_pence')::integer=6000 AND (snapshot->'lines'->0->>'session_minutes')::integer=105 AND (snapshot->>'total_pence')::integer=6000) THEN RAISE EXCEPTION 'invoice pricing metadata changed'; END IF;
 BEGIN UPDATE portal.invoices SET snapshot='{}' WHERE issued_at IS NOT NULL; RAISE EXCEPTION 'issued snapshot mutable'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;
SET ROLE synthetic_runtime;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001')) OR EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'scope wrong'; END IF;
 IF (SELECT count(*) FROM portal.read_family_invoices('synthetic-parent','80000000-0000-0000-0000-000000000001')) <> 2 THEN RAISE EXCEPTION 'invoice unavailable'; END IF;
END $$;
RESET ROLE;
REVOKE USAGE ON SCHEMA portal FROM synthetic_runtime;
DO $$ BEGIN IF has_schema_privilege('synthetic_runtime','portal','USAGE') OR NOT has_function_privilege('synthetic_runtime','portal.read_family(text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'off state wrong'; END IF; END $$;
SET ROLE synthetic_runtime;
DO $$ BEGIN BEGIN PERFORM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'off still permits entry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
GRANT USAGE ON SCHEMA portal TO synthetic_runtime;
SET ROLE synthetic_runtime;
DO $$ DECLARE member uuid; BEGIN
 IF (SELECT count(*) FROM portal.read_family_invoices('synthetic-parent','80000000-0000-0000-0000-000000000001')) <> 2 THEN RAISE EXCEPTION 'on failed'; END IF;
 SELECT id INTO member FROM portal.list_removable_memberships('synthetic-admin','parent','80000000-0000-0000-0000-000000000001') WHERE subject='synthetic-parent';
 IF member IS NULL OR portal.revoke_membership_checked('synthetic-admin',member,'parent','80000000-0000-0000-0000-000000000001',0) THEN RAISE EXCEPTION 'stale revocation accepted'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'stale revocation removed access'; END IF;
 IF NOT portal.revoke_membership_checked('synthetic-admin',member,'parent','80000000-0000-0000-0000-000000000001',2) THEN RAISE EXCEPTION 'current revocation failed'; END IF;
 IF EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001')) THEN RAISE EXCEPTION 'revoked access remained'; END IF;
END $$;
RESET ROLE;
SET ROLE synthetic_worker;
DO $$ DECLARE d uuid; t uuid; BEGIN
 SELECT delivery_id,lease_token INTO d,t FROM portal.alert_claim(60);
 IF d IS NOT NULL THEN RAISE EXCEPTION 'unexpired claim reclaimed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM portal.alert_deliveries d WHERE portal.alert_gate(d.id,d.lease_token)) THEN RAISE EXCEPTION 'revoked alert authorised'; END IF; END $$;
DO $$ BEGIN IF (SELECT count(*) FROM portal.invoices WHERE issued_at IS NOT NULL AND snapshot IS NOT NULL) <> 2 THEN RAISE EXCEPTION 'snapshot lost'; END IF; END $$;
SQL
after=$(docker exec "$container" psql -X -At -U postgres -d restored -c "SELECT md5(string_agg(id::text || snapshot::text, '' ORDER BY id)) FROM portal.invoices WHERE issued_at IS NOT NULL")
[ -n "$before" ] && [ "$before" = "$after" ]
printf 'LOCAL SYNTHETIC RESTORE AND SCHEMA-USAGE OFF/ON PASSED\n'
