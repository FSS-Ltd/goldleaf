#!/bin/sh
set -eu
host=${1:?host required}; database=${2:?database required}; port=${PGPORT:-55439}
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() { n=0; until "$@"; do n=$((n+1)); [ "$n" -lt 100 ] || { echo 'lock wait timed out' >&2; exit 1; }; sleep .1; done; }
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('view-race-admin','admin');
SELECT portal.create_family('view-race-admin','Race','c1000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('view-race-admin','parent','c1000000-0000-4000-8000-000000000001');
SQL
mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/first" 2>&1 & first=$!; exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.send_family_message('view-race-admin','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','same');" '\echo locked' >&3
wait_for grep -q locked "$tmp/first"
PGAPPNAME=view-wrapper-race psql_test -c "SELECT portal.send_message_as_role('view-race-admin','parent','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','same')" >"$tmp/second" 2>&1 & second=$!
wait_for waiting view-wrapper-race
printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$first"; wait "$second"
[ "$(psql_test -c "SELECT count(*) FROM portal.family_messages WHERE operation_id='c2000000-0000-4000-8000-000000000001'")" = 1 ]
