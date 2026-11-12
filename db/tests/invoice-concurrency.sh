#!/bin/sh
set -eu
host=${1:?pass the disposable PostgreSQL host or socket directory}
database=${2:?pass the disposable database name}
port=${PGPORT:-55439}
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
psql_test() { psql -X -qAt -v ON_ERROR_STOP=1 -h "$host" -p "$port" -d "$database" "$@"; }
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
run_overlap() {
  name=$1
  first_sql=$2
  second_sql=$3
  expected_error=${4:-}
  mkfifo "$tmp_dir/$name-input"
  psql_test <"$tmp_dir/$name-input" >"$tmp_dir/$name-first" 2>&1 &
  first=$!
  exec 3>"$tmp_dir/$name-input"
  printf '%s\n' 'BEGIN;' "$first_sql" '\echo first_locked' >&3
  wait_for grep -q first_locked "$tmp_dir/$name-first"
  PGAPPNAME="invoice-$name" psql_test -c "$second_sql" >"$tmp_dir/$name-second" 2>&1 &
  second=$!
  wait_for is_lock_waiting "invoice-$name"
  printf '%s\n' 'COMMIT;' '\q' >&3
  exec 3>&-
  wait "$first"
  if [ -n "$expected_error" ]; then
    if wait "$second"; then echo "$name: competitor unexpectedly succeeded" >&2; exit 1; fi
    grep -q "$expected_error" "$tmp_dir/$name-second"
  else
    wait "$second"
  fi
}
psql_test <<'SQL'
INSERT INTO portal.memberships(subject, role) VALUES ('race-invoice-admin', 'admin');
INSERT INTO portal.families(id, display_name) VALUES ('90000000-0000-0000-0000-000000000001', 'Race family');
SELECT portal.save_billing_settings('race-invoice-admin', 'Goldleaf Learning Ltd', '51 Hurst rd', false, NULL, NULL, 14, 'Bank', 'weekly', NULL);
INSERT INTO portal.invoices(id, family_id, recipient_name, recipient_address, created_by)
SELECT ('90000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid, '90000000-0000-0000-0000-000000000001', 'Parent', 'Address', m.id
FROM generate_series(2,5) i CROSS JOIN portal.memberships m WHERE m.subject='race-invoice-admin';
INSERT INTO portal.invoice_lines(invoice_id, description, quantity, unit_amount_pence, service_date, rate_tier, hourly_rate_pence, days, cadence, session_minutes, discount_percent)
SELECT id, 'Tuition', 1, 6000, '2027-01-01', 'standard', 3000, 1, 'weekly', 120, 0 FROM portal.invoices WHERE family_id='90000000-0000-0000-0000-000000000001';
SQL
run_overlap issue-replay \
  "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000002');" \
  "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000002');"
[ "$(cat "$tmp_dir/issue-replay-second")" = 1 ]
run_overlap payment-replay \
  "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000010', 6000, '2027-01-02', 'ref');" \
  "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000010', 6000, '2027-01-02', 'ref');"
psql_test -c "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000003')" >/dev/null
run_overlap payment-conflict \
  "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000011', 6000, '2027-01-02', 'ref');" \
  "SELECT portal.record_invoice_payment('race-invoice-admin', '90000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000012', 6000, '2027-01-02', 'ref');" \
  'invalid payment amount'
run_overlap edit-before-issue \
  "UPDATE portal.invoice_lines SET unit_amount_pence=7000 WHERE invoice_id='90000000-0000-0000-0000-000000000004';" \
  "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000004');"
run_overlap issue-before-edit \
  "SELECT portal.issue_invoice('race-invoice-admin', '90000000-0000-0000-0000-000000000005');" \
  "UPDATE portal.invoice_lines SET unit_amount_pence=7000 WHERE invoice_id='90000000-0000-0000-0000-000000000005';" \
  'issued invoice line is immutable'
psql_test <<'SQL'
DO $$ BEGIN
 IF (SELECT last_number FROM portal.invoice_number_counter) <> 4 THEN RAISE EXCEPTION 'concurrent issue duplicated number'; END IF;
 IF (SELECT count(*) FROM portal.invoice_payments WHERE invoice_id='90000000-0000-0000-0000-000000000002') <> 1
    OR (SELECT sum(amount_pence) FROM portal.invoice_payments WHERE invoice_id='90000000-0000-0000-0000-000000000002') <> 6000 THEN RAISE EXCEPTION 'payment replay duplicated'; END IF;
 IF (SELECT count(*) FROM portal.invoice_payments WHERE invoice_id='90000000-0000-0000-0000-000000000003') <> 1
    OR (SELECT sum(amount_pence) FROM portal.invoice_payments WHERE invoice_id='90000000-0000-0000-0000-000000000003') <> 6000 THEN RAISE EXCEPTION 'concurrent payments overpaid'; END IF;
 IF (SELECT (snapshot->>'total_pence')::integer FROM portal.invoices WHERE id='90000000-0000-0000-0000-000000000004') <> 7000
    OR (SELECT (snapshot->'lines'->0->>'unit_amount_pence')::integer FROM portal.invoices WHERE id='90000000-0000-0000-0000-000000000004') <> 7000 THEN RAISE EXCEPTION 'snapshot missed committed draft edit'; END IF;
 IF (SELECT (snapshot->>'total_pence')::integer FROM portal.invoices WHERE id='90000000-0000-0000-0000-000000000005') <> 6000
    OR (SELECT unit_amount_pence FROM portal.invoice_lines WHERE invoice_id='90000000-0000-0000-0000-000000000005') <> 6000 THEN RAISE EXCEPTION 'issued snapshot or line changed'; END IF;
END $$;
SQL
