#!/bin/sh
set -eu
host=${1:?host required}; database=${2:?database required}; port=${PGPORT:-55439}
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
wait_for() { n=0; until "$@"; do n=$((n+1)); [ "$n" -lt 100 ] || { echo 'listener timed out' >&2; exit 1; }; sleep .1; done; }
seq=$(psql_test -c "SELECT sequence FROM portal.family_messages WHERE operation_id='c2000000-0000-4000-8000-000000000001'")
mkfifo "$tmp/input"; psql_test <"$tmp/input" >"$tmp/output" 2>&1 & listener=$!; exec 3>"$tmp/input"
printf '%s\n' 'LISTEN portal_changes;' '\echo ready' >&3; wait_for grep -q ready "$tmp/output"
psql_test <<SQL
BEGIN;
SELECT portal.mark_messages_as_role('view-race-admin','admin','c1000000-0000-4000-8000-000000000001',$seq);
ROLLBACK;
SELECT portal.mark_messages_as_role('view-race-admin','admin','c1000000-0000-4000-8000-000000000001',$seq);
SELECT portal.mark_messages_as_role('view-race-admin','admin','c1000000-0000-4000-8000-000000000001',$seq);
SQL
printf '%s\n' 'SELECT 1;' '\echo delivered' >&3; wait_for grep -q delivered "$tmp/output"
printf '%s\n' 'UNLISTEN portal_changes;' '\q' >&3; exec 3>&-; wait "$listener"
[ "$(grep -c 'read_cursor' "$tmp/output")" = 1 ] || { echo 'cursor rollback or no-op emitted event' >&2; exit 1; }
! grep -q '"kind" : "message"' "$tmp/output" || { echo 'cursor leaked family event' >&2; exit 1; }
rm "$tmp/input"; mkfifo "$tmp/input"
psql_test <"$tmp/input" >"$tmp/invoice-events" 2>&1 & listener=$!; exec 3>"$tmp/input"
printf '%s\n' 'LISTEN portal_changes;' '\echo ready' >&3; wait_for grep -q ready "$tmp/invoice-events"
psql_test <<'SQL'
BEGIN;
INSERT INTO portal.invoices(id,family_id,recipient_name,recipient_address,created_by) SELECT 'c6000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','Parent','Address',id FROM portal.memberships WHERE subject='view-race-admin' AND role='admin';
ROLLBACK;
BEGIN;
INSERT INTO portal.invoices(id,family_id,recipient_name,recipient_address,created_by) SELECT 'c6000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Parent','Address',id FROM portal.memberships WHERE subject='view-race-admin' AND role='admin';
UPDATE portal.invoices SET invoice_number=999991,issued_at=clock_timestamp(),issued_by=(SELECT id FROM portal.memberships WHERE subject='view-race-admin' AND role='admin'),snapshot='{}'::jsonb WHERE id='c6000000-0000-4000-8000-000000000001';
INSERT INTO portal.invoice_payments(operation_id,invoice_id,amount_pence,paid_on,reference,recorded_by) SELECT 'c7000000-0000-4000-8000-000000000001','c6000000-0000-4000-8000-000000000001',1,'2027-01-01','test',id FROM portal.memberships WHERE subject='view-race-admin' AND role='admin';
COMMIT;
SQL
printf '%s\n' 'SELECT 1;' '\echo delivered' >&3; wait_for grep -q delivered "$tmp/invoice-events"
printf '%s\n' 'UNLISTEN portal_changes;' '\q' >&3; exec 3>&-; wait "$listener"
! grep -q 'c6000000-0000-4000-8000-000000000002' "$tmp/invoice-events" || { echo 'rolled-back invoice emitted event' >&2; exit 1; }
[ "$(grep -c 'invoice_family' "$tmp/invoice-events")" = 1 ] || { echo 'issued/payment event missing or duplicate' >&2; exit 1; }
[ "$(grep -c 'admin_change.*c6000000-0000-4000-8000-000000000001' "$tmp/invoice-events")" = 1 ] || { echo 'draft admin event missing or duplicate' >&2; exit 1; }
