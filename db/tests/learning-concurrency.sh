#!/bin/sh
set -eu
host=${1:?pass disposable PostgreSQL host or socket}
database=${2:?pass disposable database}
port=${PGPORT:-55439}
tmp_dir=$(mktemp -d)
trap 'rm -f "$tmp_dir/input" "$tmp_dir/first" "$tmp_dir/second"; rmdir "$tmp_dir"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo 'Timed out waiting for learning overlap' >&2; exit 1; fi
    sleep 0.1
  done
}
is_waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='learning-competitor' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('learning-race-admin','admin');
SELECT portal.create_family('learning-race-admin','Race','51000000-0000-4000-8000-000000000001');
SELECT portal.create_child('learning-race-admin','51000000-0000-4000-8000-000000000001','Child','52000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('learning-race-admin','52000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'53000000-0000-4000-8000-000000000001',NULL);
SELECT portal.save_learning_draft('learning-race-admin','53000000-0000-4000-8000-000000000001','Update',NULL,NULL,NULL,0);

SQL
fingerprint=$(psql_test -c "SELECT fingerprint FROM portal.preview_learning_draft('learning-race-admin','53000000-0000-4000-8000-000000000001',1)")
mkfifo "$tmp_dir/input"
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
first=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'BEGIN;' "SELECT portal.publish_learning_draft('learning-race-admin','53000000-0000-4000-8000-000000000001',1,'54000000-0000-4000-8000-000000000001','$fingerprint');" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp_dir/first"
PGAPPNAME=learning-competitor psql_test -c "SELECT portal.publish_learning_draft('learning-race-admin','53000000-0000-4000-8000-000000000001',1,'54000000-0000-4000-8000-000000000001','$fingerprint');" >"$tmp_dir/second" 2>&1 &
second=$!
wait_for is_waiting
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
[ "$(psql_test -c "SELECT count(*) FROM portal.published_learning_updates WHERE operation_id='54000000-0000-4000-8000-000000000001'")" = 1 ]
first_id=$(head -1 "$tmp_dir/first")
second_id=$(head -1 "$tmp_dir/second")
[ "$first_id" = "$second_id" ]
# Concurrent note edits: the stale writer must fail after the first commit.
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
first=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'BEGIN;' "SELECT portal.save_private_note('learning-race-admin','53000000-0000-4000-8000-000000000001','First',0);" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp_dir/first"
PGAPPNAME=learning-competitor psql_test -c "SELECT portal.save_private_note('learning-race-admin','53000000-0000-4000-8000-000000000001','Second',0);" >"$tmp_dir/second" 2>&1 &
second=$!
wait_for is_waiting
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then echo 'Stale note write succeeded' >&2; exit 1; fi
grep -q 'note changed' "$tmp_dir/second"
[ "$(psql_test -c "SELECT body FROM portal.session_private_notes WHERE session_id='53000000-0000-4000-8000-000000000001'")" = First ]
# Assignment removal waits for an already-authorised write, then denies later writes.
psql_test -c "INSERT INTO portal.memberships(subject,role) VALUES ('learning-race-staff','staff'); INSERT INTO portal.staff_family_assignments(staff_id,family_id) SELECT id,'51000000-0000-4000-8000-000000000001' FROM portal.memberships WHERE subject='learning-race-staff';"
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
first=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'BEGIN;' "SELECT portal.save_private_note('learning-race-staff','53000000-0000-4000-8000-000000000001','Before removal',1);" '\echo first_locked' >&3
wait_for grep -q first_locked "$tmp_dir/first"
PGAPPNAME=learning-competitor psql_test -c "DELETE FROM portal.staff_family_assignments WHERE staff_id=(SELECT id FROM portal.memberships WHERE subject='learning-race-staff');" >"$tmp_dir/second" 2>&1 &
second=$!
wait_for is_waiting
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
if psql_test -c "SELECT portal.save_private_note('learning-race-staff','53000000-0000-4000-8000-000000000001','After removal',2);" >"$tmp_dir/second" 2>&1; then echo 'Removed assignment still writable' >&2; exit 1; fi
grep -q 'not authorised' "$tmp_dir/second"
# LISTEN receives IDs only after commit; a rolled-back change produces no event.
psql_test <"$tmp_dir/input" >"$tmp_dir/first" 2>&1 &
listener=$!
exec 3>"$tmp_dir/input"
printf '%s\n' 'LISTEN portal_changes;' '\echo listening' >&3
wait_for grep -q listening "$tmp_dir/first"
psql_test -c "BEGIN; SELECT portal.rename_child('learning-race-admin','52000000-0000-4000-8000-000000000001','Rolled back'); ROLLBACK;" >/dev/null
printf '%s\n' 'SELECT 1;' '\echo rollback_checked' >&3
wait_for grep -q rollback_checked "$tmp_dir/first"
if grep -q 'Asynchronous notification' "$tmp_dir/first"; then echo 'Rolled back change notified' >&2; exit 1; fi
psql_test -c "SELECT portal.rename_child('learning-race-admin','52000000-0000-4000-8000-000000000001','Committed');" >/dev/null
printf '%s\n' 'SELECT 1;' '\echo commit_checked' >&3
wait_for grep -q commit_checked "$tmp_dir/first"
grep -q 'Asynchronous notification' "$tmp_dir/first"
grep -q '52000000-0000-4000-8000-000000000001' "$tmp_dir/first"
if grep -q 'Committed' "$tmp_dir/first"; then echo 'Notification included content' >&2; exit 1; fi
printf '%s\n' '\q' >&3
exec 3>&-
wait "$listener"
