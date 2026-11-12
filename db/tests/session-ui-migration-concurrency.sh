#!/bin/sh
set -eu
host=${1:?pass disposable host or socket}
database=${2:?pass empty disposable database}
port=${PGPORT:-55439}
tmp=$(mktemp -d)
trap 'rm -f "$tmp/actor" "$tmp/writer" "$tmp/actor.out" "$tmp/writer.out" "$tmp/old-b.out" "$tmp/old-c.out" "$tmp/migration.out"; rmdir "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo 'Timed out waiting for migration overlap' >&2; exit 1; fi
    sleep 0.1
  done
}
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
for migration in db/migrations/000[1-9]_*.sql db/migrations/001[0-3]_*.sql; do psql_test -f "$migration" >/dev/null; done
psql_test <<'SQL' >/dev/null
INSERT INTO portal.memberships(subject,role) VALUES ('overlap-owner','admin'),('overlap-old','admin'),('overlap-new','admin');
SELECT portal.create_family('overlap-owner','Family','91000000-0000-4000-8000-000000000001');
SELECT portal.create_child('overlap-owner','91000000-0000-4000-8000-000000000001','Child','92000000-0000-4000-8000-000000000001');
SELECT portal.schedule_child_session('overlap-owner','92000000-0000-4000-8000-000000000001','2026-12-01 10:00+00',120,'93000000-0000-4000-8000-000000000001',NULL);
SELECT portal.schedule_child_session('overlap-owner','92000000-0000-4000-8000-000000000001','2026-12-01 11:00+00',120,'93000000-0000-4000-8000-000000000002',NULL);
SELECT portal.schedule_child_session('overlap-owner','92000000-0000-4000-8000-000000000001','2026-12-01 12:00+00',120,'93000000-0000-4000-8000-000000000003',NULL);
SELECT portal.schedule_child_session('overlap-owner','92000000-0000-4000-8000-000000000001','2026-12-01 13:00+00',120,'93000000-0000-4000-8000-000000000004',NULL);
SELECT portal.save_learning_draft('overlap-owner',id,'Shared',NULL,NULL,NULL,ARRAY[]::text[],0) FROM portal.sessions WHERE family_id='91000000-0000-4000-8000-000000000001';
SQL
fingerprint() { psql_test -c "SELECT fingerprint FROM portal.preview_learning_draft('overlap-owner','$1',1)"; }
fp_a=$(fingerprint 93000000-0000-4000-8000-000000000001)
fp_b=$(fingerprint 93000000-0000-4000-8000-000000000002)
fp_c=$(fingerprint 93000000-0000-4000-8000-000000000003)
fp_d=$(fingerprint 93000000-0000-4000-8000-000000000004)
psql_test -c "SELECT portal.publish_learning_draft('overlap-owner','93000000-0000-4000-8000-000000000001',1,'94000000-0000-4000-8000-000000000001','$fp_a')" >/dev/null
mkfifo "$tmp/actor" "$tmp/writer"
psql_test <"$tmp/actor" >"$tmp/actor.out" 2>&1 & actor=$!
exec 3>"$tmp/actor"
printf '%s\n' 'BEGIN;' "SELECT id FROM portal.memberships WHERE subject='overlap-old' FOR UPDATE;" '\echo actor_locked' >&3
wait_for grep -q actor_locked "$tmp/actor.out"
PGAPPNAME=overlap-old-b psql_test -c "SELECT portal.publish_learning_draft('overlap-old','93000000-0000-4000-8000-000000000002',1,'94000000-0000-4000-8000-000000000002','$fp_b')" >"$tmp/old-b.out" 2>&1 & old_b=$!
PGAPPNAME=overlap-old-c psql_test -c "SELECT portal.publish_learning_draft('overlap-old','93000000-0000-4000-8000-000000000003',1,'94000000-0000-4000-8000-000000000003','$fp_c')" >"$tmp/old-c.out" 2>&1 & old_c=$!
wait_for waiting overlap-old-b
wait_for waiting overlap-old-c
psql_test <"$tmp/writer" >"$tmp/writer.out" 2>&1 & writer=$!
exec 4>"$tmp/writer"
printf '%s\n' 'BEGIN;' "SELECT portal.publish_learning_draft('overlap-owner','93000000-0000-4000-8000-000000000004',1,'94000000-0000-4000-8000-000000000004','$fp_d');" '\echo legacy_inserted' >&4
wait_for grep -q legacy_inserted "$tmp/writer.out"
PGAPPNAME=overlap-migration psql_test -f db/migrations/0014_session_ui_access.sql >"$tmp/migration.out" 2>&1 & migration=$!
wait_for waiting overlap-migration
printf '%s\n' 'COMMIT;' '\q' >&4
exec 4>&-
wait "$writer"
wait "$migration"
[ "$(psql_test -c "SELECT count(*) FROM portal.learning_publication_operations WHERE operation_id='94000000-0000-4000-8000-000000000004'")" = 1 ]
psql_test -c "SELECT portal.publish_learning_draft('overlap-new','93000000-0000-4000-8000-000000000001',1,'94000000-0000-4000-8000-000000000002','$fp_a')" >/dev/null
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$actor"
if wait "$old_b"; then echo 'Old publisher rebound an acknowledged operation' >&2; exit 1; fi
grep -q 'operation already used' "$tmp/old-b.out"
wait "$old_c"
[ "$(psql_test -c "SELECT count(*) FROM portal.learning_publication_operations WHERE operation_id='94000000-0000-4000-8000-000000000003' AND session_id='93000000-0000-4000-8000-000000000003'")" = 1 ]
[ "$(psql_test -c "SELECT count(*) FROM portal.learning_publication_operations WHERE operation_id='94000000-0000-4000-8000-000000000002' AND session_id='93000000-0000-4000-8000-000000000001'")" = 1 ]
