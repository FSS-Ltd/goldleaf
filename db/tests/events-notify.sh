#!/bin/sh
set -eu
host=${1:?host required}; database=${2:?database required}; port=${PGPORT:-55439}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() { attempts=0; until "$@"; do attempts=$((attempts+1)); [ "$attempts" -lt 100 ] || { echo 'listener timed out' >&2; exit 1; }; sleep .1; done; }
mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/output" 2>&1 & listener=$!
exec 3>"$tmp/input"
printf '%s\n' 'LISTEN portal_changes;' '\echo ready' >&3
wait_for grep -q ready "$tmp/output"
psql_test <<'SQL'
BEGIN;
SELECT pg_notify('portal_changes','rolled-back');
ROLLBACK;
BEGIN;
SELECT pg_notify('portal_changes','committed');
SELECT pg_notify('portal_changes','committed');
COMMIT;
SQL
printf '%s\n' 'SELECT 1;' '\echo delivered' >&3
wait_for grep -q delivered "$tmp/output"
printf '%s\n' 'UNLISTEN portal_changes;' '\q' >&3
exec 3>&-
wait "$listener"
! grep -q 'rolled-back' "$tmp/output"
[ "$(grep -c 'payload "committed"' "$tmp/output")" = 1 ]
