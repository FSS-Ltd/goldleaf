#!/bin/sh
set -eu
TASK_PG_HOST=${1:?pass the disposable PostgreSQL host or socket directory}
TASK_DB=${2:?pass a separate empty disposable database}
TASK_TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TASK_TMP_DIR"' EXIT
psql_test() { psql -X -qAt -h "$TASK_PG_HOST" -p 55439 "$TASK_DB" -v ON_ERROR_STOP=1 "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo "Timed out waiting for $*" >&2; exit 1; fi
    sleep 0.1
  done
}
psql_test -f db/migrations/0001_founding_availability.sql -f db/migrations/0002_seed_founding_slots.sql -f db/migrations/0003_portal_onboarding.sql
psql_test <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('migration-admin', 'admin');
INSERT INTO portal.families(id, display_name) VALUES ('20000000-0000-0000-0000-000000000001', 'Migration family');
SELECT portal.issue_invitation('migration-admin','20000000-0000-0000-0000-000000000001','existing@example.com',decode(repeat('f1',32),'hex'),now()+interval '1 day');
SQL
# Pause after backfill, before the parent trigger is installed.
awk -v prefix="$TASK_TMP_DIR/prefix.sql" -v suffix="$TASK_TMP_DIR/suffix.sql" '
  /^REVOKE ALL ON portal.invitation_digests FROM PUBLIC;/ { tail=1 }
  { if (tail) print > suffix; else print > prefix }
' db/migrations/0004_staff_onboarding.sql
mkfifo "$TASK_TMP_DIR/migration-input"
psql_test <"$TASK_TMP_DIR/migration-input" >"$TASK_TMP_DIR/migration-output" 2>&1 &
migration=$!
exec 3>"$TASK_TMP_DIR/migration-input"
printf '%s\n' "\\i $TASK_TMP_DIR/prefix.sql" '\echo backfill_finished' >&3
wait_for grep -q backfill_finished "$TASK_TMP_DIR/migration-output"
PGAPPNAME=staff-migration-writer psql_test -c "INSERT INTO portal.invitations(family_id, issued_version, email, token_digest, expires_at, created_by) SELECT '20000000-0000-0000-0000-000000000001', 2, 'concurrent@example.com', decode(repeat('f2',32),'hex'), now()+interval '1 day', id FROM portal.memberships WHERE subject='migration-admin'" >"$TASK_TMP_DIR/writer-output" 2>&1 &
writer=$!
is_writer_waiting() {
  [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='staff-migration-writer' AND wait_event_type='Lock'")" = 1 ]
}
if ! wait_for is_writer_waiting; then
  printf '%s\n' 'ROLLBACK;' '\q' >&3
  exec 3>&-
  wait "$migration" || true
  wait "$writer" || true
  exit 1
fi
printf '%s\n' "\\i $TASK_TMP_DIR/suffix.sql" '\q' >&3
exec 3>&-
wait "$migration"
wait "$writer"
[ "$(psql_test -c "SELECT count(*) FROM portal.invitation_digests WHERE digest IN (decode(repeat('f1',32),'hex'),decode(repeat('f2',32),'hex'))")" = 2 ] || { echo 'Parent digest missing from registry' >&2; exit 1; }
if psql_test -c "SELECT portal.issue_staff_invitation('migration-admin','staff@example.com',decode(repeat('f1',32),'hex'),now()+interval '1 day')" >"$TASK_TMP_DIR/collision" 2>&1; then
  echo 'Preexisting parent digest accepted for staff' >&2; exit 1
fi
