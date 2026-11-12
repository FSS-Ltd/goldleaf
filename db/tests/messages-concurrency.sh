#!/bin/sh
set -eu
host=${1:?host required}; database=${2:?database required}; port=${PGPORT:-55439}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() { attempts=0; until "$@"; do attempts=$((attempts+1)); [ "$attempts" -lt 100 ] || { echo 'lock wait timed out' >&2; exit 1; }; sleep .1; done; }
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('message-race-admin','admin');
SELECT portal.create_family('message-race-admin','Race','96000000-0000-4000-8000-000000000001');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('message-race-parent','parent','96000000-0000-4000-8000-000000000001');
SELECT portal.send_family_message('message-race-admin','96000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001','first');
SQL
first_sequence=$(psql_test -c "SELECT sequence FROM portal.family_messages WHERE operation_id='97000000-0000-4000-8000-000000000001'")
mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/first" 2>&1 & first=$!
exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.send_family_message('message-race-admin','96000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','second');" '\echo locked' >&3
wait_for grep -q locked "$tmp/first"
PGAPPNAME=message-read-race psql_test -c "SELECT portal.mark_family_messages_read('message-race-parent','96000000-0000-4000-8000-000000000001',$first_sequence)" >"$tmp/read" 2>&1 & second=$!
wait_for waiting message-read-race
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"; wait "$second"
[ "$(psql_test -c "SELECT portal.family_message_unread('message-race-parent','96000000-0000-4000-8000-000000000001')")" = 1 ] || { echo 'late message missed' >&2; exit 1; }
[ "$(psql_test -c "SELECT count(*) FROM portal.family_messages WHERE operation_id='97000000-0000-4000-8000-000000000002'")" = 1 ]
rm "$tmp/input"
mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/first-replay" 2>&1 & first=$!
exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.send_family_message('message-race-admin','96000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000003','replay');" '\echo replay_locked' >&3
wait_for grep -q replay_locked "$tmp/first-replay"
PGAPPNAME=message-replay-race psql_test -c "SELECT portal.send_family_message('message-race-admin','96000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000003','replay')" >"$tmp/replay" 2>&1 & second=$!
wait_for waiting message-replay-race
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"; wait "$second"
[ "$(psql_test -c "SELECT count(*) FROM portal.family_messages WHERE operation_id='97000000-0000-4000-8000-000000000003'")" = 1 ] || { echo 'duplicate send' >&2; exit 1; }
[ "$(cat "$tmp/replay")" = "$(psql_test -c "SELECT sequence FROM portal.family_messages WHERE operation_id='97000000-0000-4000-8000-000000000003'")" ]
