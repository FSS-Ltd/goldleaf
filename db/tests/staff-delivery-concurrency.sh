#!/bin/sh
set -eu
host=${1:?pass the disposable PostgreSQL host or socket directory}
database=${2:?pass the disposable database name}
port=${PGPORT:-55439}
tmp_dir=$(mktemp -d)
trap 'rm -f "$tmp_dir/input" "$tmp_dir/first" "$tmp_dir/second"; rmdir "$tmp_dir"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo 'Timed out waiting for staff invitation overlap' >&2; exit 1; fi
    sleep 0.1
  done
}
is_lock_waiting() {
  [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name = 'staff-delivery-competitor' AND wait_event_type = 'Lock'")" = 1 ]
}
psql_test -c "INSERT INTO portal.memberships(subject, role) VALUES ('staff-delivery-race-admin', 'admin')"
mkfifo "$tmp_dir/input"
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
first=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'BEGIN;' "SELECT portal.issue_staff_delivery('staff-delivery-race-admin','race@example.invalid',decode(repeat('51',32),'hex'),now()+interval '1 day','60000000-0000-4000-8000-000000000011');" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp_dir/first"
PGAPPNAME=staff-delivery-competitor psql_test -c "SELECT portal.issue_staff_delivery('staff-delivery-race-admin','race@example.invalid',decode(repeat('52',32),'hex'),now()+interval '1 day','60000000-0000-4000-8000-000000000011')" >"$tmp_dir/second" 2>&1 &
second=$!
wait_for is_lock_waiting
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then echo 'Concurrent staff invitation replay succeeded' >&2; exit 1; fi
grep -q 'request already used' "$tmp_dir/second"
[ "$(psql_test -c "SELECT count(*) FROM portal.staff_invitations WHERE email = 'race@example.invalid'")" = 1 ]
