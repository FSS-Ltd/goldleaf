#!/bin/sh
set -eu
TASK_PG_HOST=${1:?pass the disposable PostgreSQL host or socket directory}
TASK_TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TASK_TMP_DIR"' EXIT
TASK_DB=${2:?pass the disposable database name}
psql_test() { psql -X -qAt -h "$TASK_PG_HOST" -p 55439 "$TASK_DB" -v ON_ERROR_STOP=1 "$@"; }
psql_test <<'SQL'
INSERT INTO portal.memberships(subject,role) VALUES ('race-admin','admin');
INSERT INTO portal.families(id) SELECT ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid FROM generate_series(1,6) i;
SELECT portal.set_founding('race-admin', ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, true) FROM generate_series(1,4) i;
SQL
psql_test -c "BEGIN; SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000005',true); SELECT pg_sleep(1); COMMIT" >"$TASK_TMP_DIR/race-a" &
first=$!
sleep 0.2
if psql_test -c "SELECT portal.set_founding('race-admin','00000000-0000-0000-0000-000000000006',true)" >"$TASK_TMP_DIR/race-b" 2>&1; then
  echo 'Over-capacity claim succeeded' >&2
  exit 1
fi
wait "$first"
grep -q "founding capacity reached" "$TASK_TMP_DIR/race-b"
[ "$(psql_test -c 'SELECT count(*) FROM portal.founding_slots WHERE family_id IS NOT NULL')" = 5 ]
psql_test -c "SELECT portal.issue_invitation('race-admin','00000000-0000-0000-0000-000000000001','race@example.com',decode(repeat('aa',32),'hex'),now()+interval '1 day')" >/dev/null
psql_test -c "BEGIN; SELECT portal.accept_invitation('race-parent','race@example.com',decode(repeat('aa',32),'hex')); SELECT pg_sleep(1); COMMIT" >"$TASK_TMP_DIR/accept-a" &
first=$!
sleep 0.2
if psql_test -c "SELECT portal.accept_invitation('race-parent','race@example.com',decode(repeat('aa',32),'hex'))" >"$TASK_TMP_DIR/accept-b" 2>&1; then
  echo 'Concurrent invitation replay succeeded' >&2
  exit 1
fi
wait "$first"
[ "$(psql_test -c "SELECT count(*) FROM portal.memberships WHERE subject='race-parent' AND revoked_at IS NULL")" = 1 ]
# A committed admin mutation holds a shared membership lock until transaction end.
psql_test -c "BEGIN; SELECT portal.create_family('race-admin','Lock test'); SELECT pg_sleep(1); COMMIT" >"$TASK_TMP_DIR/admin-mutation" &
first=$!
sleep 0.2
psql_test -c "UPDATE portal.memberships SET revoked_at = clock_timestamp() WHERE subject = 'race-admin'" >/dev/null
wait "$first"
if psql_test -c "SELECT portal.create_family('race-admin','Denied')" >"$TASK_TMP_DIR/revoked-admin" 2>&1; then
  echo 'Revoked admin mutation succeeded' >&2
  exit 1
fi
