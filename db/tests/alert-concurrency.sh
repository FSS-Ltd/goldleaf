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
# Parent gate must not lock the unrelated staff invitation-order row.
psql_test -c 'SELECT 1 FROM portal.staff_invitation_order WHERE singleton FOR UPDATE NOWAIT' >/dev/null
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
# Staff gate must not lock the unrelated family row.
psql_test -c "SELECT 1 FROM portal.families WHERE id='d1000000-0000-4000-8000-000000000001' FOR UPDATE NOWAIT" >/dev/null
docker exec -i -e PGAPPNAME=alert-staff-remove "$container" psql -X -U postgres -qAt -v ON_ERROR_STOP=1 -c "SELECT portal.set_staff_family_access('race-admin',(SELECT id FROM portal.memberships WHERE subject='race-staff'),'d1000000-0000-4000-8000-000000000001',false)" >"$tmp/remove" 2>&1 & remove_pid=$!
wait_for waiting alert-staff-remove
finish_gate
wait "$remove_pid"
psql_test -c "SELECT portal.set_staff_family_access('race-admin',(SELECT id FROM portal.memberships WHERE subject='race-staff'),'d1000000-0000-4000-8000-000000000001',true)" >/dev/null
[ "$(psql_test -c "SELECT portal.alert_gate(id,lease_token) FROM portal.alert_deliveries WHERE subject='race-staff'")" = f ]
# Both lease and frozen-attempt cutoff must be checked after waiting for family locks.
psql_test <<'SQL' >/dev/null
UPDATE portal.memberships SET revoked_at=NULL WHERE subject='race-parent';
UPDATE portal.alert_deliveries SET status='cancelled',lease_token=NULL,lease_until=NULL;
SELECT portal.send_family_message('race-admin','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000003','test');
SQL
for mode in lease cutoff; do
 psql_test -c "UPDATE portal.alert_deliveries SET status='leased',lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '60 seconds',payload=jsonb_build_object('from','a','to','b','subject','x','text','x'),idempotency_key='race',first_attempt_at=clock_timestamp() WHERE subject='race-parent' AND event_id=(SELECT id FROM portal.alert_events WHERE source_id=(SELECT max(sequence)::text FROM portal.family_messages))" >/dev/null
 if [ "$mode" = lease ]; then
  psql_test -c "UPDATE portal.alert_deliveries SET lease_until=clock_timestamp()+interval '1 second' WHERE subject='race-parent' AND status='leased'" >/dev/null
 else
  psql_test -c "UPDATE portal.alert_deliveries SET first_attempt_at=clock_timestamp()-interval '23 hours'+interval '1 second' WHERE subject='race-parent' AND status='leased'" >/dev/null
 fi
 fifo="$tmp/family-$mode"; mkfifo "$fifo"
 psql_test <"$fifo" >"$tmp/family-output-$mode" 2>&1 & family_pid=$!
 exec 3>"$fifo"
 printf '%s\n' 'BEGIN;' "SELECT 1 FROM portal.families WHERE id='d1000000-0000-4000-8000-000000000001' FOR UPDATE;" '\echo family_locked' >&3
 wait_for grep -q family_locked "$tmp/family-output-$mode"
 docker exec -i -e PGAPPNAME="alert-expiry-$mode" "$container" psql -X -U postgres -qAt -v ON_ERROR_STOP=1 -c "SELECT portal.alert_gate(id,lease_token) FROM portal.alert_deliveries WHERE subject='race-parent' AND status='leased'" >"$tmp/expiry-$mode" 2>&1 & expiry_pid=$!
 wait_for waiting "alert-expiry-$mode"
 sleep 1.2
 printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$family_pid"; wait "$expiry_pid"
 grep -qx f "$tmp/expiry-$mode" || { cat "$tmp/expiry-$mode" >&2; exit 1; }
 psql_test -c "UPDATE portal.alert_deliveries SET status='cancelled',lease_token=NULL,lease_until=NULL WHERE subject='race-parent' AND status='leased'" >/dev/null
done
echo 'alert concurrency and worker grants passed'
