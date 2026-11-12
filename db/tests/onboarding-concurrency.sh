#!/bin/sh
set -eu
TASK_PG_HOST=${1:?pass the disposable PostgreSQL host or socket directory}
TASK_TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TASK_TMP_DIR"' EXIT
TASK_DB=${2:?pass the disposable database name}
psql_test() { psql -X -qAt -h "$TASK_PG_HOST" -p 55439 "$TASK_DB" -v ON_ERROR_STOP=1 "$@"; }
wait_for() {
  attempts=0
  while ! "$@"; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 100 ]; then echo "Timed out waiting for $*" >&2; exit 1; fi
    sleep 0.1
  done
}
is_lock_waiting() {
  [ "$(psql_test -c "SELECT count(*) FROM pg_stat_activity WHERE application_name = '$1' AND wait_event_type = 'Lock'")" = 1 ]
}
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('race-admin','admin');
INSERT INTO portal.families(id) SELECT ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid FROM generate_series(1,6) i;
SELECT portal.set_founding('race-admin', ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, true) FROM generate_series(1,4) i;
SQL
mkfifo "$TASK_TMP_DIR/slot-input"
psql_test <"$TASK_TMP_DIR/slot-input" >"$TASK_TMP_DIR/race-a" 2>&1 &
first=$!
exec 3>"$TASK_TMP_DIR/slot-input"
printf '%s\n' 'BEGIN;' "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000005',true);" '\echo slot_locked' >&3
wait_for grep -q slot_locked "$TASK_TMP_DIR/race-a"
PGAPPNAME=slot-competitor psql_test -c "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000006',true)" >"$TASK_TMP_DIR/race-b" 2>&1 &
second=$!
wait_for is_lock_waiting slot-competitor
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then
  echo 'Over-capacity claim succeeded' >&2
  exit 1
fi
grep -q "founding capacity reached" "$TASK_TMP_DIR/race-b"
[ "$(psql_test -c 'SELECT count(*) FROM portal.founding_slots WHERE family_id IS NOT NULL')" = 5 ]
[ "$(psql_test -c "SELECT count(*) FROM portal.founding_slots WHERE family_id = '00000000-0000-0000-0000-000000000005'")" = 1 ]
[ "$(psql_test -c "SELECT count(*) FROM portal.founding_slots WHERE family_id = '00000000-0000-0000-0000-000000000006'")" = 0 ]
psql_test -c "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000005',false)" >/dev/null
mkfifo "$TASK_TMP_DIR/same-family-input"
psql_test <"$TASK_TMP_DIR/same-family-input" >"$TASK_TMP_DIR/same-family-a" 2>&1 &
first=$!
exec 3>"$TASK_TMP_DIR/same-family-input"
printf '%s\n' 'BEGIN;' "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000006',true);" '\echo same_family_locked' >&3
wait_for grep -q same_family_locked "$TASK_TMP_DIR/same-family-a"
PGAPPNAME=same-family-competitor psql_test -c "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000006',true)" >"$TASK_TMP_DIR/same-family-b" 2>&1 &
second=$!
wait_for is_lock_waiting same-family-competitor
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
grep -qx t "$TASK_TMP_DIR/same-family-a"
grep -qx t "$TASK_TMP_DIR/same-family-b"
[ "$(psql_test -c "SELECT count(*) FROM portal.founding_slots WHERE family_id = '00000000-0000-0000-0000-000000000006'")" = 1 ]
[ "$(psql_test -c "SELECT count(*) FROM portal.founding_history WHERE family_id = '00000000-0000-0000-0000-000000000006' AND is_founding")" = 1 ]
psql_test -c "SELECT portal.issue_invitation('race-admin','00000000-0000-0000-0000-000000000001','race@example.com',decode(repeat('aa',32),'hex'),now()+interval '1 day')" >/dev/null
mkfifo "$TASK_TMP_DIR/accept-input"
psql_test <"$TASK_TMP_DIR/accept-input" >"$TASK_TMP_DIR/accept-a" 2>&1 &
first=$!
exec 3>"$TASK_TMP_DIR/accept-input"
printf '%s\n' 'BEGIN;' "SELECT portal.accept_invitation('race-parent','race@example.com',decode(repeat('aa',32),'hex'));" '\echo accepted_locked' >&3
wait_for grep -q accepted_locked "$TASK_TMP_DIR/accept-a"
PGAPPNAME=accept-competitor psql_test -c "SELECT portal.accept_invitation('race-parent','race@example.com',decode(repeat('aa',32),'hex'))" >"$TASK_TMP_DIR/accept-b" 2>&1 &
second=$!
wait_for is_lock_waiting accept-competitor
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then
  echo 'Concurrent invitation replay succeeded' >&2
  exit 1
fi
grep -q 'invalid invitation' "$TASK_TMP_DIR/accept-b"
[ "$(psql_test -c "SELECT count(*) FROM portal.memberships WHERE subject='race-parent' AND role='parent' AND family_id='00000000-0000-0000-0000-000000000001' AND revoked_at IS NULL")" = 1 ]
[ "$(psql_test -c "SELECT count(*) FROM portal.invitations WHERE token_digest=decode(repeat('aa',32),'hex') AND consumed_at IS NOT NULL")" = 1 ]
# A committed admin mutation holds a shared membership lock until transaction end.
mkfifo "$TASK_TMP_DIR/admin-input"
psql_test <"$TASK_TMP_DIR/admin-input" >"$TASK_TMP_DIR/admin-mutation" 2>&1 &
first=$!
exec 3>"$TASK_TMP_DIR/admin-input"
printf '%s\n' 'BEGIN;' "SELECT portal.create_family('race-admin','Lock test');" '\echo admin_locked' >&3
wait_for grep -q admin_locked "$TASK_TMP_DIR/admin-mutation"
PGAPPNAME=admin-revocation psql_test -c "UPDATE portal.memberships SET revoked_at = clock_timestamp() WHERE subject = 'race-admin'" >/dev/null &
second=$!
wait_for is_lock_waiting admin-revocation
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
wait "$second"
if psql_test -c "SELECT portal.create_family('race-admin','Denied')" >"$TASK_TMP_DIR/revoked-admin" 2>&1; then
  echo 'Revoked admin mutation succeeded' >&2
  exit 1
fi

# Hold the first transaction open and prove the second waits on its lock.
psql_test <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('overlap-admin', 'admin');
INSERT INTO portal.memberships(subject, role, family_id) VALUES
  ('overlap-parent', 'parent', '00000000-0000-0000-0000-000000000001');
SQL
run_overlap() {
  order=$1
  digest=$2
  mkfifo "$TASK_TMP_DIR/input-$order"
  psql_test <"$TASK_TMP_DIR/input-$order" >"$TASK_TMP_DIR/first-$order" 2>&1 &
  first=$!
  exec 3>"$TASK_TMP_DIR/input-$order"
  printf '%s\n' 'BEGIN;' "$3" '\echo first_locked' >&3
  wait_for grep -q first_locked "$TASK_TMP_DIR/first-$order"
  PGAPPNAME="overlap-$order" psql_test -c "$4" >"$TASK_TMP_DIR/second-$order" 2>&1 &
  second=$!
  wait_for is_lock_waiting "overlap-$order"
  printf '%s\n' 'COMMIT;' '\q' >&3
  exec 3>&-
  wait "$first"
  wait "$second"
  if [ "$order" = issue-first ]; then
    if psql_test -c "SELECT portal.accept_invitation('overlap-parent','overlap@example.com',decode(repeat('$digest',32),'hex'))" >"$TASK_TMP_DIR/stale" 2>&1; then
      echo 'Invitation issued before revocation restored membership' >&2; exit 1
    fi
  else
    psql_test -c "SELECT portal.accept_invitation('overlap-parent','overlap@example.com',decode(repeat('$digest',32),'hex'))" >/dev/null
  fi
}
run_overlap issue-first bb \
  "SELECT portal.issue_invitation('overlap-admin','00000000-0000-0000-0000-000000000001','overlap@example.com',decode(repeat('bb',32),'hex'),now()+interval '1 day');" \
  "SELECT portal.revoke_membership('overlap-admin',(SELECT id FROM portal.memberships WHERE subject='overlap-parent'));"
psql_test -c "SELECT portal.issue_invitation('overlap-admin','00000000-0000-0000-0000-000000000001','overlap@example.com',decode(repeat('dd',32),'hex'),now()+interval '1 day'); SELECT portal.accept_invitation('overlap-parent','overlap@example.com',decode(repeat('dd',32),'hex'));" >/dev/null
run_overlap revoke-first cc \
  "SELECT portal.revoke_membership('overlap-admin',(SELECT id FROM portal.memberships WHERE subject='overlap-parent'));" \
  "SELECT portal.issue_invitation('overlap-admin','00000000-0000-0000-0000-000000000001','overlap@example.com',decode(repeat('cc',32),'hex'),now()+interval '1 day');"

# Staff issuance and revocation serialize on the invitation version, in either order.
psql_test <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('staff-race-admin', 'admin'), ('staff-race', 'staff');
SQL
run_staff_overlap() {
  order=$1
  digest=$2
  mkfifo "$TASK_TMP_DIR/staff-$order"
  psql_test <"$TASK_TMP_DIR/staff-$order" >"$TASK_TMP_DIR/staff-first-$order" 2>&1 &
  first=$!
  exec 3>"$TASK_TMP_DIR/staff-$order"
  printf '%s\n' 'BEGIN;' "$3" '\echo first_locked' >&3
  wait_for grep -q first_locked "$TASK_TMP_DIR/staff-first-$order"
  PGAPPNAME="staff-$order" psql_test -c "$4" >"$TASK_TMP_DIR/staff-second-$order" 2>&1 &
  second=$!
  wait_for is_lock_waiting "staff-$order"
  printf '%s\n' 'COMMIT;' '\q' >&3
  exec 3>&-
  wait "$first"
  wait "$second"
  if [ "$order" = issue-first ]; then
    if psql_test -c "SELECT portal.accept_staff_invitation('staff-race','staff-race@example.com',decode(repeat('$digest',32),'hex'))" >"$TASK_TMP_DIR/staff-stale" 2>&1; then
      echo 'Staff invitation issued before revocation restored membership' >&2; exit 1
    fi
  else
    psql_test -c "SELECT portal.accept_staff_invitation('staff-race','staff-race@example.com',decode(repeat('$digest',32),'hex'))" >/dev/null
  fi
}
run_staff_overlap issue-first e1 \
  "SELECT portal.issue_staff_invitation('staff-race-admin','staff-race@example.com',decode(repeat('e1',32),'hex'),now()+interval '1 day');" \
  "SELECT portal.revoke_membership('staff-race-admin',(SELECT id FROM portal.memberships WHERE subject='staff-race'));"
run_staff_overlap revoke-first e2 \
  "SELECT portal.revoke_membership('staff-race-admin',(SELECT id FROM portal.memberships WHERE subject='staff-race'));" \
  "SELECT portal.issue_staff_invitation('staff-race-admin','staff-race@example.com',decode(repeat('e2',32),'hex'),now()+interval '1 day');"
psql_test -c "SELECT portal.issue_staff_invitation('staff-race-admin','replay@example.com',decode(repeat('e3',32),'hex'),now()+interval '1 day')" >/dev/null
mkfifo "$TASK_TMP_DIR/staff-accept"
psql_test <"$TASK_TMP_DIR/staff-accept" >"$TASK_TMP_DIR/staff-accept-first" 2>&1 &
first=$!
exec 3>"$TASK_TMP_DIR/staff-accept"
printf '%s\n' 'BEGIN;' "SELECT portal.accept_staff_invitation('staff-replay','replay@example.com',decode(repeat('e3',32),'hex'));" '\echo accepted_locked' >&3
wait_for grep -q accepted_locked "$TASK_TMP_DIR/staff-accept-first"
PGAPPNAME=staff-accept-competitor psql_test -c "SELECT portal.accept_staff_invitation('staff-replay','replay@example.com',decode(repeat('e3',32),'hex'))" >"$TASK_TMP_DIR/staff-accept-second" 2>&1 &
second=$!
wait_for is_lock_waiting staff-accept-competitor
printf '%s\n' 'COMMIT;' '\q' >&3
exec 3>&-
wait "$first"
if wait "$second"; then echo 'Concurrent staff invitation replay succeeded' >&2; exit 1; fi
grep -q 'invalid invitation' "$TASK_TMP_DIR/staff-accept-second"
