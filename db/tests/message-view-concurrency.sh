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
rm "$tmp/input"; mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/revoke" 2>&1 & first=$!; exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.revoke_membership('view-race-admin',(SELECT id FROM portal.memberships WHERE subject='view-race-admin' AND role='parent'));" '\echo revoked_locked' >&3
wait_for grep -q revoked_locked "$tmp/revoke"
PGAPPNAME=view-role-revocation psql_test -c "SELECT portal.send_message_as_role('view-race-admin','parent','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002','should fail')" >"$tmp/revoked-send" 2>&1 & second=$!
wait_for waiting view-role-revocation
printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$first"
if wait "$second"; then echo 'revoked role write succeeded' >&2; exit 1; fi
grep -q 'not authorised' "$tmp/revoked-send"
[ "$(psql_test -c "SELECT count(*) FROM portal.family_messages WHERE operation_id='c2000000-0000-4000-8000-000000000002'")" = 0 ]
psql_test -c "SELECT portal.send_message_as_role('view-race-admin','admin','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000003','admin remains')" >/dev/null
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('view-race-parent2','parent','c1000000-0000-4000-8000-000000000001');
SELECT portal.create_child('view-race-admin','c1000000-0000-4000-8000-000000000001','Child','c3000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('view-race-admin','c3000000-0000-4000-8000-000000000001','2027-01-01 10:00Z',120,'c4000000-0000-4000-8000-000000000001',NULL);
SELECT portal.request_session_change('view-race-parent2','c4000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000001','Request');
SQL
rm "$tmp/input"; mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/reschedule" 2>&1 & first=$!; exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.reschedule_child_session('view-race-admin','c4000000-0000-4000-8000-000000000001','2027-01-02 10:00Z');" '\echo session_locked' >&3
wait_for grep -q session_locked "$tmp/reschedule"
PGAPPNAME=view-session-race psql_test -c "SELECT portal.resolve_request_checked('view-race-admin','c5000000-0000-4000-8000-000000000001','No overwrite',NULL,'2027-01-01 10:00Z','scheduled')" >"$tmp/stale-resolution" 2>&1 & second=$!
wait_for waiting view-session-race
printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$first"
if wait "$second"; then echo 'stale resolution succeeded' >&2; exit 1; fi
grep -q 'session changed' "$tmp/stale-resolution"
[ "$(psql_test -c "SELECT resolved_at IS NULL FROM portal.session_change_requests WHERE id='c5000000-0000-4000-8000-000000000001'")" = t ]
rm "$tmp/input"; mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/resolve" 2>&1 & first=$!; exec 3>"$tmp/input"
printf '%s\n' 'BEGIN;' "SELECT portal.resolve_request_checked('view-race-admin','c5000000-0000-4000-8000-000000000001','First',NULL,'2027-01-02 10:00Z','scheduled');" '\echo resolution_locked' >&3
wait_for grep -q resolution_locked "$tmp/resolve"
PGAPPNAME=view-resolution-race psql_test -c "SELECT portal.resolve_request_checked('view-race-admin','c5000000-0000-4000-8000-000000000001','Second',NULL,'2027-01-02 10:00Z','scheduled')" >"$tmp/second-resolution" 2>&1 & second=$!
wait_for waiting view-resolution-race
printf '%s\n' 'COMMIT;' '\q' >&3; exec 3>&-; wait "$first"
if wait "$second"; then echo 'second resolution succeeded' >&2; exit 1; fi
grep -q 'request already resolved' "$tmp/second-resolution"
[ "$(psql_test -c "SELECT resolution FROM portal.session_change_requests WHERE id='c5000000-0000-4000-8000-000000000001'")" = First ]
