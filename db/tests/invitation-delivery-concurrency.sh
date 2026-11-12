#!/bin/sh
set -eu
host=${1:?pass the disposable PostgreSQL host or socket directory}
database=${2:?pass the disposable database name}
port=${PGPORT:-55439}
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo 'Timed out waiting for resend overlap' >&2; exit 1; fi
    sleep 0.1
  done
}
is_lock_waiting() {
  [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name = 'delivery-competitor' AND wait_event_type = 'Lock'")" = 1 ]
}
psql_test <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('delivery-race-admin', 'admin');
SELECT portal.create_family('delivery-race-admin', 'Delivery race', '50000000-0000-4000-8000-000000000001');
SQL
mkfifo "$tmp_dir/input"
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
first=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'BEGIN;' "SELECT portal.issue_parent_delivery('delivery-race-admin','50000000-0000-4000-8000-000000000001','race@example.com',decode(repeat('31',32),'hex'),now()+interval '1 day','60000000-0000-4000-8000-000000000001');" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp_dir/first"
PGAPPNAME=delivery-competitor psql_test -c "SELECT portal.issue_parent_delivery('delivery-race-admin','50000000-0000-4000-8000-000000000001','race@example.com',decode(repeat('32',32),'hex'),now()+interval '1 day','60000000-0000-4000-8000-000000000001')" >"$tmp_dir/second" 2>&1 &
second=$!
wait_for is_lock_waiting
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then echo 'Concurrent resend replay succeeded' >&2; exit 1; fi
grep -q 'request already used' "$tmp_dir/second"
[ "$(psql_test -c "SELECT count(*) FROM portal.invitations WHERE family_id = '50000000-0000-4000-8000-000000000001'")" = 1 ]
