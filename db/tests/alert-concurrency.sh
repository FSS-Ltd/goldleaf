#!/bin/sh
# Disposable network-isolated PostgreSQL; image must already exist locally.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
container="goldleaf-alert-test-$$"
tmp=$(mktemp -d)
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT HUP INT TERM
docker run --network none --pull=never -d --rm --name "$container" -e POSTGRES_PASSWORD=local-test-only postgres:17-alpine >/dev/null
psql_test() { docker exec -i "$container" psql -X -U postgres -qAt -v ON_ERROR_STOP=1 "$@"; }
attempt=0
until docker logs "$container" 2>&1 | grep -q "PostgreSQL init process complete"; do
 attempt=$((attempt+1)); [ "$attempt" -lt 100 ] || exit 1; sleep .1
done
for migration in "$root"/db/migrations/*.sql; do psql_test < "$migration" >/dev/null; done
psql_test < "$root/db/tests/alert-worker-grants.sql" >/dev/null
psql_test < "$root/db/tests/alerts.sql" >/dev/null
psql_test < "$root/db/tests/alert-lifecycle.sql" >/dev/null
psql_test <<'SQL' >/dev/null
CREATE ROLE alert_race_worker NOLOGIN;
GRANT USAGE ON SCHEMA portal TO alert_race_worker;
GRANT EXECUTE ON FUNCTION portal.alert_claim(integer),portal.alert_next_due(),portal.alert_gate(uuid,uuid),portal.alert_freeze(uuid,uuid,jsonb,text),portal.alert_finish(uuid,uuid,text,timestamptz) TO alert_race_worker;
INSERT INTO portal.memberships(subject,role) VALUES ('race-admin','admin'),('race-staff','staff');
SELECT portal.create_family('race-admin','Race','d1000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('race-parent','parent','d1000000-0000-4000-8000-000000000001');
SELECT portal.send_family_message('race-admin','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','test');
SQL
wait_for() { n=0; until "$@"; do n=$((n+1)); [ "$n" -lt 100 ] || { echo 'concurrency wait timed out' >&2; exit 1; }; sleep .1; done; }
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
start_gate() {
 fifo="$tmp/gate-$1"; mkfifo "$fifo"
 psql_test <"$fifo" >"$tmp/gate-output-$1" 2>&1 & gate_pid=$!
 exec 3>"$fifo"
 printf '%s\n' 'SET ROLE alert_race_worker;' 'BEGIN;' 'SELECT portal.alert_gate(delivery_id,lease_token) FROM portal.alert_claim(60);' '\echo gate_locked' >&3
 wait_for grep -q gate_locked "$tmp/gate-output-$1"
 grep -qx t "$tmp/gate-output-$1" || { cat "$tmp/gate-output-$1" >&2; exit 1; }
}
finish_gate() { printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$gate_pid"; }
start_gate parent
# The only due job is already locked by the first claim.
[ "$(psql_test -c 'SET ROLE alert_race_worker; SELECT count(*) FROM portal.alert_claim(60)')" = 0 ]
docker exec -i -e PGAPPNAME=alert-parent-revoke "$container" psql -X -U postgres -qAt -v ON_ERROR_STOP=1 -c "SELECT portal.revoke_membership('race-admin',(SELECT id FROM portal.memberships WHERE subject='race-parent'))" >"$tmp/revoke" 2>&1 & revoke_pid=$!
wait_for waiting alert-parent-revoke
finish_gate
wait "$revoke_pid"
[ "$(psql_test -c "SELECT portal.alert_gate(id,lease_token) FROM portal.alert_deliveries WHERE subject='race-parent'")" = f ]
psql_test <<'SQL' >/dev/null
UPDATE portal.alert_deliveries SET status='cancelled',lease_token=NULL,lease_until=NULL;
INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'d1000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='race-staff';
SELECT portal.send_family_message('race-admin','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','test');
SQL
start_gate staff
docker exec -i -e PGAPPNAME=alert-staff-remove "$container" psql -X -U postgres -qAt -v ON_ERROR_STOP=1 -c "SELECT portal.set_staff_family_access('race-admin',(SELECT id FROM portal.memberships WHERE subject='race-staff'),'d1000000-0000-4000-8000-000000000001',false)" >"$tmp/remove" 2>&1 & remove_pid=$!
wait_for waiting alert-staff-remove
finish_gate
wait "$remove_pid"
psql_test -c "SELECT portal.set_staff_family_access('race-admin',(SELECT id FROM portal.memberships WHERE subject='race-staff'),'d1000000-0000-4000-8000-000000000001',true)" >/dev/null
[ "$(psql_test -c "SELECT portal.alert_gate(id,lease_token) FROM portal.alert_deliveries WHERE subject='race-staff'")" = f ]
echo 'alert concurrency and worker grants passed'
