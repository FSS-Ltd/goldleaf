#!/bin/bash
set -euo pipefail
# Require an already installed image; never pull an image or connect to a host database.
docker image inspect postgres:17-alpine >/dev/null
container=$(docker run -d --rm --pull never --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine)
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for attempt in {1..30}; do if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi; sleep 1; done
docker exec "$container" createdb -U postgres source
docker exec "$container" createdb -U postgres restored
docker exec "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source -c 'CREATE ROLE synthetic_runtime NOLOGIN' >/dev/null
for migration in db/migrations/*.sql; do docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source < "$migration" >/dev/null; done
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d source >/dev/null <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('synthetic-admin','admin');
INSERT INTO portal.families(id,display_name) VALUES ('80000000-0000-0000-0000-000000000001','Synthetic A'),('80000000-0000-0000-0000-000000000002','Synthetic B');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('synthetic-parent','parent','80000000-0000-0000-0000-000000000001');
SELECT portal.save_billing_settings('synthetic-admin','Synthetic issuer','Synthetic address',false,NULL,NULL,14,'Bank','weekly','2027-04-01');
DO $$ DECLARE inv uuid; ctx jsonb; BEGIN
 inv := portal.create_invoice_draft('synthetic-admin','80000000-0000-0000-0000-000000000001','Synthetic parent','Synthetic address','[{"description":"Tuition","quantity":1,"unit_amount_pence":6000,"service_date":"2027-03-27","rate_tier":"standard","hourly_rate_pence":3000,"days":1,"cadence":"weekly","session_minutes":120,"discount_percent":0}]');
 ctx := portal.invoice_issue_context('synthetic-admin',inv);
 PERFORM portal.issue_invoice_checked('synthetic-admin',inv,ctx);
END $$;
GRANT USAGE ON SCHEMA portal TO synthetic_runtime;
GRANT EXECUTE ON FUNCTION portal.read_family(text,uuid), portal.read_family_invoices(text,uuid) TO synthetic_runtime;
SQL
before=$(docker exec "$container" psql -X -At -U postgres -d source -c "SELECT md5(snapshot::text) FROM portal.invoices WHERE issued_at IS NOT NULL")
docker exec "$container" pg_dump -U postgres -Fc -d source -f /tmp/backup.dump
docker exec "$container" pg_restore -U postgres --exit-on-error -d restored /tmp/backup.dump
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d restored <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM portal.invoices WHERE issued_at IS NOT NULL AND snapshot IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'issued snapshot missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM portal.memberships m JOIN portal.families f ON f.id=m.family_id WHERE m.subject='synthetic-parent' AND f.display_name='Synthetic A') THEN RAISE EXCEPTION 'relationship missing'; END IF;
 IF NOT has_schema_privilege('synthetic_runtime','portal','USAGE') OR NOT has_function_privilege('synthetic_runtime','portal.read_family(text,uuid)','EXECUTE') OR has_table_privilege('synthetic_runtime','portal.families','SELECT') THEN RAISE EXCEPTION 'grants wrong'; END IF;
END $$;
SET ROLE synthetic_runtime;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001')) OR EXISTS (SELECT 1 FROM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'scope wrong'; END IF;
 IF (SELECT count(*) FROM portal.read_family_invoices('synthetic-parent','80000000-0000-0000-0000-000000000001')) <> 1 THEN RAISE EXCEPTION 'invoice unavailable'; END IF;
END $$;
RESET ROLE;
REVOKE USAGE ON SCHEMA portal FROM synthetic_runtime;
DO $$ BEGIN IF has_schema_privilege('synthetic_runtime','portal','USAGE') OR NOT has_function_privilege('synthetic_runtime','portal.read_family(text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'off state wrong'; END IF; END $$;
SET ROLE synthetic_runtime;
DO $$ BEGIN BEGIN PERFORM portal.read_family('synthetic-parent','80000000-0000-0000-0000-000000000001'); RAISE EXCEPTION 'off still permits entry'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
GRANT USAGE ON SCHEMA portal TO synthetic_runtime;
SET ROLE synthetic_runtime;
DO $$ BEGIN IF (SELECT count(*) FROM portal.read_family_invoices('synthetic-parent','80000000-0000-0000-0000-000000000001')) <> 1 THEN RAISE EXCEPTION 'on failed'; END IF; END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM portal.invoices WHERE issued_at IS NOT NULL AND snapshot IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'snapshot lost'; END IF; END $$;
SQL
after=$(docker exec "$container" psql -X -At -U postgres -d restored -c "SELECT md5(snapshot::text) FROM portal.invoices WHERE issued_at IS NOT NULL")
[ -n "$before" ] && [ "$before" = "$after" ]
printf 'LOCAL SYNTHETIC RESTORE AND SCHEMA-USAGE OFF/ON PASSED\n'
