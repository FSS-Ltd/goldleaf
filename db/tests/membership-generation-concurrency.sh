#!/bin/sh
set -eu
TASK_PG_HOST=${1:?pass disposable PostgreSQL host}
TASK_DB=${2:?pass disposable database}
TASK_PG_PORT=${3:-55439}
TASK_TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TASK_TMP_DIR"' EXIT
psql_test() { psql -X -qAt -h "$TASK_PG_HOST" -p "$TASK_PG_PORT" "$TASK_DB" -v ON_ERROR_STOP=1 "$@"; }
wait_for() {
  attempts=0
  until "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo 'Timed out waiting for concurrency test' >&2; exit 1; fi
    sleep 0.1
  done
}
waiting() { [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='$1' AND wait_event_type='Lock'")" = 1 ]; }
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('generation-race-admin','admin');
INSERT INTO portal.families(id,display_name) VALUES ('21000000-0000-4000-8000-000000000003','Race family');
INSERT INTO portal.memberships(subject,role,family_id) VALUES ('generation-race-parent','parent','21000000-0000-4000-8000-000000000003');
INSERT INTO portal.memberships(subject,role) VALUES ('generation-race-staff','staff');
SELECT portal.revoke_membership_checked('generation-race-admin',(SELECT id FROM portal.memberships WHERE subject='generation-race-parent'),'parent','21000000-0000-4000-8000-000000000003',0);
SELECT portal.revoke_membership_checked('generation-race-admin',(SELECT id FROM portal.memberships WHERE subject='generation-race-staff'),'staff',NULL,0);
SELECT portal.issue_invitation('generation-race-admin','21000000-0000-4000-8000-000000000003','race-parent@example.invalid',decode(repeat('c1',32),'hex'),now()+interval '1 day');
SELECT portal.issue_staff_invitation('generation-race-admin','race-staff@example.invalid',decode(repeat('c2',32),'hex'),now()+interval '1 day');
SQL
for role in parent staff; do
  if [ "$role" = parent ]; then
    accept="SELECT portal.accept_invitation('generation-race-parent','race-parent@example.invalid',decode(repeat('c1',32),'hex'));"
    family="'21000000-0000-4000-8000-000000000003'"
  else
    accept="SELECT portal.accept_staff_invitation('generation-race-staff','race-staff@example.invalid',decode(repeat('c2',32),'hex'));"
    family=NULL
  fi
  mkfifo "$TASK_TMP_DIR/$role-input"
  psql_test <"$TASK_TMP_DIR/$role-input" >"$TASK_TMP_DIR/$role-accept" 2>&1 & first=$!
  exec 3>"$TASK_TMP_DIR/$role-input"
  printf '%s\n' 'BEGIN;' "$accept" '\echo accepted_locked' >&3
  wait_for grep -q accepted_locked "$TASK_TMP_DIR/$role-accept"
  PGAPPNAME="generation-$role" psql_test -c "SELECT portal.revoke_membership_checked('generation-race-admin',(SELECT id FROM portal.memberships WHERE subject='generation-race-$role'),'$role',$family,0)" >"$TASK_TMP_DIR/$role-revoke" 2>&1 & second=$!
  wait_for waiting "generation-$role"
  printf '%s\n' 'COMMIT;' '\q' >&3
  exec 3>&-
  wait "$first"
  wait "$second"
  grep -qx f "$TASK_TMP_DIR/$role-revoke"
  [ "$(psql_test -c "SELECT count(*) FROM portal.memberships WHERE subject='generation-race-$role' AND revoked_at IS NULL AND access_generation=2")" = 1 ]
done
printf '%s\n' 'membership generation concurrent acceptance passed'
